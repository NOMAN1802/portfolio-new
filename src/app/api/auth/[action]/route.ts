import { NextRequest, NextResponse } from "next/server";
import { compare, hash as bcrypt } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { body, endpoint, HttpError } from "@/lib/http";
import { throttle } from "@/lib/rate";
import { User, Session, Audit } from "@/models";
import {
  tokens,
  setTokens,
  clearTokens,
  hash,
  verify,
  requireAdmin,
  userDTO,
} from "@/lib/auth";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ action: string }> };
export async function GET(req: NextRequest, ctx: Ctx) {
  return endpoint(async () => {
    if ((await ctx.params).action !== "me")
      throw new HttpError(404, "Not found");
    const { user } = await requireAdmin(true);
    return { user: userDTO(user) };
  })(req);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return endpoint(async (req) => {
    const { action } = await ctx.params;
    if (action === "login") {
      await throttle(req, "login", 8);
      const input = z
        .object({
          email: z.email().max(254),
          password: z.string().min(1).max(128),
        })
        .parse(await body(req));
      const user = await User.findOne({
        email: input.email.toLowerCase(),
        active: true,
      }).select("+passwordHash");
      const dummy =
        "$2b$12$C6UzMDM.H6dfI/f/IKcEe.4xY0JjzD7km2vD6P0rE3OrIK8S9gWvi";
      const valid = await compare(input.password, user?.passwordHash || dummy);
      if (!user || !valid)
        throw new HttpError(401, "Email or password is incorrect.");
      const session = new Session({
        userId: user._id,
        refreshHash: "pending",
        expiresAt: new Date(),
      });
      const t = await tokens(String(user._id), String(session._id));
      session.refreshHash = hash(t.refresh);
      session.expiresAt = new Date(Date.now() + t.refreshSeconds * 1000);
      await session.save();
      const res = NextResponse.json({ user: userDTO(user) });
      setTokens(res, t);
      return res;
    }
    if (action === "refresh") {
      const { payload, value } = await verify("refresh");
      await db();
      const user = await User.findOne({ _id: payload.sub, active: true });
      if (!user) throw new HttpError(401, "Please sign in again.");
      const t = await tokens(String(user._id), String(payload.sid));
      const session = await Session.findOneAndUpdate(
        {
          _id: payload.sid,
          userId: user._id,
          refreshHash: hash(value),
          revoked: false,
          expiresAt: { $gt: new Date() },
        },
        { $set: { refreshHash: hash(t.refresh) } },
        { returnDocument: "after" },
      );
      if (!session) {
        await Session.updateOne(
          { _id: payload.sid },
          { $set: { revoked: true } },
        );
        throw new HttpError(
          401,
          "Session no longer valid. Please sign in again.",
        );
      }
      // The original database expiry is an absolute session lifetime, not a sliding one.
      const res = NextResponse.json({ user: userDTO(user) });
      setTokens(res, t);
      return res;
    }
    if (action === "logout") {
      try {
        const { payload } = await verify("refresh");
        await db();
        await Session.updateOne(
          { _id: payload.sid, userId: payload.sub },
          { $set: { revoked: true } },
        );
      } catch (error) {
        if (!(error instanceof HttpError)) throw error;
      }
      const res = NextResponse.json({ ok: true });
      clearTokens(res);
      return res;
    }
    if (action === "change-password") {
      const { user } = await requireAdmin(true);
      await throttle(req, "password", 6);
      const input = z
        .object({
          currentPassword: z.string().min(1).max(128),
          password: z
            .string()
            .min(12)
            .max(72)
            .refine(
              (v) => new TextEncoder().encode(v).length <= 72,
              "Use at most 72 UTF-8 bytes",
            ),
        })
        .parse(await body(req));
      const secret = await User.findById(user._id).select("+passwordHash");
      if (
        !secret ||
        !(await compare(input.currentPassword, secret.passwordHash))
      )
        throw new HttpError(400, "Current password is incorrect.");
      secret.passwordHash = await bcrypt(
        input.password,
        env().BCRYPT_SALT_ROUNDS,
      );
      secret.mustChangePassword = false;
      await secret.save();
      await Session.updateMany(
        { userId: user._id },
        { $set: { revoked: true } },
      );
      await Audit.create({
        actor: String(user._id),
        action: "password-change",
        entity: "account",
        entityId: String(user._id),
        fields: [],
      });
      const res = NextResponse.json({ ok: true });
      clearTokens(res);
      return res;
    }
    throw new HttpError(404, "Not found");
  }, true)(req);
}

import { createHash, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "./db";
import { env } from "./env";
import { User, Session } from "@/models";
import { HttpError } from "./http";
const ACCESS = "emon_access",
  REFRESH = "emon_refresh";
const encoder = new TextEncoder();
export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function seconds(duration: string) {
  const m = /^(\d+)([smhd])$/.exec(duration);
  if (!m) throw new Error("Invalid token lifetime");
  return Number(m[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[m[2]]!;
}
export async function tokens(userId: string, sid: string) {
  const e = env();
  const accessSeconds = seconds(e.JWT_ACCESS_EXPIRES_IN),
    refreshSeconds = seconds(e.JWT_REFRESH_EXPIRES_IN);
  const sign = (type: string, key: string, ttl: number) =>
    new SignJWT({ sid, type })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuer("emon-portfolio")
      .setAudience("emon-admin")
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
      .sign(encoder.encode(key));
  const [access, refresh] = await Promise.all([
    sign("access", e.JWT_ACCESS_SECRET, accessSeconds),
    sign("refresh", e.JWT_REFRESH_SECRET, refreshSeconds),
  ]);
  return { access, refresh, accessSeconds, refreshSeconds };
}
export function setTokens(
  res: NextResponse,
  t: Awaited<ReturnType<typeof tokens>>,
) {
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
  res.cookies.set(ACCESS, t.access, { ...opts, maxAge: t.accessSeconds });
  res.cookies.set(REFRESH, t.refresh, { ...opts, maxAge: t.refreshSeconds });
}
export function clearTokens(res: NextResponse) {
  for (const name of [ACCESS, REFRESH])
    res.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
}
export async function verify(type: "access" | "refresh") {
  const value = (await cookies()).get(
    type === "access" ? ACCESS : REFRESH,
  )?.value;
  if (!value) throw new HttpError(401, "Please sign in.");
  const e = env();
  try {
    const { payload } = await jwtVerify(
      value,
      encoder.encode(
        type === "access" ? e.JWT_ACCESS_SECRET : e.JWT_REFRESH_SECRET,
      ),
      {
        algorithms: ["HS256"],
        issuer: "emon-portfolio",
        audience: "emon-admin",
      },
    );
    if (
      payload.type !== type ||
      typeof payload.sid !== "string" ||
      !payload.sub
    )
      throw new Error();
    return { payload, value };
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }
}
export async function requireAdmin(allowPasswordChange = false) {
  const { payload } = await verify("access");
  await db();
  const [session, user] = await Promise.all([
    Session.findOne({
      _id: payload.sid,
      userId: payload.sub,
      revoked: false,
      expiresAt: { $gt: new Date() },
    }),
    User.findOne({ _id: payload.sub, active: true }),
  ]);
  if (!session || !user) throw new HttpError(401, "Please sign in again.");
  if (user.mustChangePassword && !allowPasswordChange)
    throw new HttpError(
      403,
      "Change your initial password in Account before editing content.",
    );
  return { user, sid: String(payload.sid) };
}
export function userDTO(user: {
  _id: unknown;
  name?: string;
  email?: string;
  mobile?: string;
  mustChangePassword?: boolean;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    mustChangePassword: !!user.mustChangePassword,
  };
}

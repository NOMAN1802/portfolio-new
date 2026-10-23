import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { endpoint, body, HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { Content, Site, Message, Media, Audit, UploadIntent } from "@/models";
import {
  kinds,
  entrySchema,
  settingsSchema,
  defaultSettings,
} from "@/lib/content";
import { entryDTO } from "@/lib/data";
import { cloud, formats } from "@/lib/media";
type Ctx = { params: Promise<{ resource: string }> };
export const runtime = "nodejs";
export async function GET(req: NextRequest, ctx: Ctx) {
  return endpoint(async () => {
    await requireAdmin();
    const { resource } = await ctx.params;
    if (resource === "settings")
      return {
        data: {
          ...defaultSettings,
          ...(await Site.findOne({ key: "main" }))?.data,
        },
      };
    if (resource === "dashboard")
      return {
        data: {
          projects: await Content.countDocuments({ kind: "projects" }),
          published: await Content.countDocuments({
            kind: "projects",
            status: "published",
            visible: true,
          }),
          unread: await Message.countDocuments({
            read: false,
            archived: false,
          }),
          media: await Media.countDocuments(),
        },
      };
    const page = Math.max(
      1,
      Math.min(10000, Number(req.nextUrl.searchParams.get("page")) || 1),
    );
    const skip = (page - 1) * 50;
    if (resource === "messages")
      return {
        data: await Message.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(50)
          .lean(),
        total: await Message.countDocuments(),
      };
    if (resource === "media")
      return {
        data: await Media.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(50)
          .lean(),
        total: await Media.countDocuments(),
      };
    if (resource === "audit")
      return {
        data: await Audit.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(50)
          .lean(),
        total: await Audit.countDocuments(),
      };
    if (!kinds.includes(resource as (typeof kinds)[number]))
      throw new HttpError(404, "Not found");
    const records = await Content.find({ kind: resource })
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(50)
      .lean();
    return {
      data: records.map((r) =>
        entryDTO(r as unknown as Record<string, unknown>),
      ),
      total: await Content.countDocuments({ kind: resource }),
    };
  })(req);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return endpoint(async (req) => {
    const { user } = await requireAdmin();
    const { resource } = await ctx.params;
    const input = await body(req);
    if (resource === "settings") {
      const data = settingsSchema.parse(input);
      await Site.updateOne(
        { key: "main" },
        { $set: { data } },
        { upsert: true },
      );
      await Audit.create({
        actor: String(user._id),
        action: "save",
        entity: "settings",
        entityId: "main",
        fields: Object.keys(data),
      });
      return { data };
    }
    if (resource === "upload-signature") {
      const c = cloud();
      const publicId = `emon-portfolio/${randomUUID()}`;
      const params = {
        timestamp: Math.floor(Date.now() / 1000),
        public_id: publicId,
        upload_preset:
          process.env.CLOUDINARY_UPLOAD_PRESET || "emon_portfolio_signed",
        overwrite: false,
      };
      await UploadIntent.create({
        publicId,
        ownerId: String(user._id),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      return {
        params,
        signature: c.utils.api_sign_request(
          params,
          process.env.CLOUDINARY_API_SECRET!,
        ),
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      };
    }
    if (resource === "media") {
      const { publicId, alt } = z
        .object({
          publicId: z.string().max(200),
          alt: z.string().trim().min(1).max(200),
        })
        .parse(input);
      const intent = await UploadIntent.findOne({
        publicId,
        ownerId: String(user._id),
        completed: false,
        expiresAt: { $gt: new Date() },
      });
      if (!intent)
        throw new HttpError(
          400,
          "Upload has expired or is not owned by this account.",
        );
      const result = await cloud().api.resource(publicId, {
        resource_type: "image",
      });
      if (
        !formats.includes(result.format) ||
        result.bytes > Number(process.env.UPLOAD_MAX_BYTES || 10485760)
      ) {
        await cloud().uploader.destroy(publicId);
        throw new HttpError(
          400,
          "Upload must be an allowed image or PDF under the configured size limit.",
        );
      }
      const data = await Media.findOneAndUpdate(
        { publicId },
        {
          $setOnInsert: {
            publicId,
            url: result.secure_url,
            resourceType: "image",
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            alt,
          },
        },
        { upsert: true, returnDocument: "after" },
      );
      intent.completed = true;
      await intent.save();
      await Audit.create({
        actor: String(user._id),
        action: "upload",
        entity: "media",
        entityId: String(data._id),
        fields: ["asset", "alt"],
      });
      return { data };
    }
    if (!kinds.includes(resource as (typeof kinds)[number]))
      throw new HttpError(404, "Not found");
    const data = entrySchema.parse(input);
    const record = await Content.create({
      kind: resource,
      title: data.title,
      slug: data.slug,
      order: data.order,
      visible: data.visible,
      status: data.status,
      payload: data,
    });
    await Audit.create({
      actor: String(user._id),
      action: "create",
      entity: resource,
      entityId: String(record._id),
      fields: Object.keys(data),
    });
    return { data: entryDTO(record.toObject()) };
  }, true)(req);
}

import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { endpoint, body, HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { Content, Message, Media, Site, Audit } from "@/models";
import { kinds, entrySchema } from "@/lib/content";
import { entryDTO } from "@/lib/data";
import { cloud } from "@/lib/media";
import { notify } from "@/lib/mail";
type Ctx = { params: Promise<{ resource: string; id: string }> };
export const runtime = "nodejs";
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return endpoint(async (req) => {
    const { user } = await requireAdmin();
    const { resource, id } = await ctx.params;
    if (!isValidObjectId(id)) throw new HttpError(404, "Not found");
    const input = await body(req);
    if (resource === "messages") {
      const values = z
        .object({
          read: z.boolean().optional(),
          archived: z.boolean().optional(),
          retry: z.boolean().optional(),
        })
        .parse(input);
      if (values.retry) {
        const claimed = await Message.findOneAndUpdate(
          { _id: id, notification: "failed" },
          { $set: { notification: "sending" } },
          { returnDocument: "after" },
        );
        if (!claimed)
          throw new HttpError(409, "Only failed notifications can be retried.");
        await notify(id);
      }
      const update = {
        ...(values.read !== undefined ? { read: values.read } : {}),
        ...(values.archived !== undefined ? { archived: values.archived } : {}),
      };
      const data = Object.keys(update).length
        ? await Message.findByIdAndUpdate(
            id,
            { $set: update },
            { returnDocument: "after" },
          )
        : await Message.findById(id);
      if (!data) throw new HttpError(404, "Not found");
      return { data };
    }
    if (resource === "media") {
      const { alt } = z
        .object({ alt: z.string().trim().min(1).max(200) })
        .parse(input);
      const data = await Media.findByIdAndUpdate(
        id,
        { $set: { alt } },
        { returnDocument: "after" },
      );
      if (!data) throw new HttpError(404, "Not found");
      return { data };
    }
    if (!kinds.includes(resource as (typeof kinds)[number]))
      throw new HttpError(404, "Not found");
    const values = entrySchema.parse(input);
    const data = await Content.findOneAndUpdate(
      { _id: id, kind: resource },
      {
        $set: {
          title: values.title,
          slug: values.slug,
          order: values.order,
          visible: values.visible,
          status: values.status,
          payload: values,
        },
      },
      { returnDocument: "after" },
    );
    if (!data) throw new HttpError(404, "Not found");
    await Audit.create({
      actor: String(user._id),
      action: "update",
      entity: resource,
      entityId: id,
      fields: Object.keys(values),
    });
    return { data: entryDTO(data.toObject()) };
  }, true)(req);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return endpoint(async (req) => {
    const { user } = await requireAdmin();
    const { resource, id } = await ctx.params;
    if (!isValidObjectId(id)) throw new HttpError(404, "Not found");
    if (resource === "media") {
      const item = await Media.findById(id);
      if (!item) throw new HttpError(404, "Not found");
      const [settings, entries] = await Promise.all([
        Site.findOne({ key: "main" }),
        Content.find(),
      ]);
      if (
        JSON.stringify([
          settings?.data,
          ...entries.map((e) => e.payload),
        ]).includes(item.url)
      )
        throw new HttpError(
          409,
          "This asset is used by content. Replace it there before deleting.",
        );
      await cloud().uploader.destroy(item.publicId, {
        resource_type: item.resourceType,
      });
      await item.deleteOne();
    } else if (resource === "messages") {
      await Message.findByIdAndDelete(id);
    } else if (kinds.includes(resource as (typeof kinds)[number])) {
      await Content.findOneAndDelete({ _id: id, kind: resource });
    } else throw new HttpError(404, "Not found");
    await Audit.create({
      actor: String(user._id),
      action: "delete",
      entity: resource,
      entityId: id,
      fields: [],
    });
    return { ok: true };
  }, true)(req);
}

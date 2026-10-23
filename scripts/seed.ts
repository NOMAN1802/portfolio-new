import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { db } from "../src/lib/db";
import { env } from "../src/lib/env";
import {
  User,
  Content,
  Site,
  Session,
  Rate,
  Media,
  UploadIntent,
} from "../src/models";
import { defaultSettings, defaultEntries } from "../src/lib/content";
import { cloud, formats } from "../src/lib/media";
async function main() {
  if (process.env.ADMIN_BOOTSTRAP_ENABLED !== "true")
    throw new Error(
      "Set ADMIN_BOOTSTRAP_ENABLED=true for this explicit command.",
    );
  const e = env();
  const admin = z
    .object({
      ADMIN_EMAIL: z.email(),
      ADMIN_PASSWORD: z.string().min(8).max(72),
      ADMIN_NAME: z.string().min(1),
    })
    .parse(process.env);
  await db();
  await Promise.all([
    User.init(),
    Content.init(),
    Site.init(),
    Session.init(),
    Rate.init(),
    Media.init(),
    UploadIntent.init(),
  ]);
  const existing = await User.findOne({
    email: admin.ADMIN_EMAIL.toLowerCase(),
  });
  if (!existing)
    await User.create({
      name: admin.ADMIN_NAME,
      email: admin.ADMIN_EMAIL.toLowerCase(),
      mobile: process.env.ADMIN_MOBILE_NUMBER || "",
      passwordHash: await hash(admin.ADMIN_PASSWORD, e.BCRYPT_SALT_ROUNDS),
      mustChangePassword: true,
    });
  await Site.updateOne(
    { key: "main" },
    { $setOnInsert: { data: defaultSettings } },
    { upsert: true },
  );
  // Example projects remain drafts. Existing edits are never overwritten.
  for (const entry of defaultEntries) {
    const { _id, kind, ...payload } = entry;
    void _id;
    if (kind === "projects") payload.status = "draft";
    await Content.updateOne(
      { kind, slug: payload.slug },
      {
        $setOnInsert: {
          kind,
          title: payload.title,
          slug: payload.slug,
          order: payload.order,
          visible: payload.visible,
          status: payload.status,
          payload,
        },
      },
      { upsert: true },
    );
  }
  if (
    process.env.CLOUDINARY_API_SECRET &&
    !process.env.CLOUDINARY_API_SECRET.includes("REPLACE")
  ) {
    const c = cloud();
    const name =
      process.env.CLOUDINARY_UPLOAD_PRESET || "emon_portfolio_signed";
    try {
      await c.api.upload_preset(name);
    } catch (error) {
      if (
        (error as { error?: { http_code: number } })?.error?.http_code !== 404
      )
        throw error;
      await c.api.create_upload_preset({
        name,
        unsigned: false,
        allowed_formats: formats,
        max_file_size: Number(process.env.UPLOAD_MAX_BYTES || 10485760),
        overwrite: false,
      });
    }
  }
  console.log(
    "Bootstrap complete. Existing accounts and content preserved. Change the initial password in Account, then disable bootstrap.",
  );
}
main()
  .catch((error) => {
    console.error(
      "Bootstrap failed:",
      error instanceof z.ZodError
        ? error.issues.map((i) => i.path.join(".")).join(", ")
        : error?.name || "ConfigurationError",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

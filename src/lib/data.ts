import {
  defaultSettings,
  defaultEntries,
  Settings,
  Entry,
  Kind,
} from "./content";
import { configured } from "./env";
import { db } from "./db";
import { Site, Content } from "@/models";
export function entryDTO(record: Record<string, unknown>): Entry {
  return {
    ...(record.payload as Entry),
    _id: String(record._id),
    kind: record.kind as Kind,
  };
}
export async function portfolio() {
  if (!configured())
    return { settings: defaultSettings, entries: defaultEntries, demo: true };
  await db();
  const [site, records] = await Promise.all([
    Site.findOne({ key: "main" }).lean(),
    Content.find({ visible: true, status: "published" })
      .sort({ order: 1, createdAt: -1 })
      .lean(),
  ]);
  return {
    settings: { ...defaultSettings, ...site?.data } as Settings,
    entries: records.map((r) =>
      entryDTO(r as unknown as Record<string, unknown>),
    ),
    demo: false,
  };
}
export async function getProject(slug: string, preview = false) {
  if (!configured())
    return defaultEntries.find((e) => e.kind === "projects" && e.slug === slug);
  await db();
  const r = await Content.findOne({
    kind: "projects",
    slug,
    ...(preview ? {} : { status: "published", visible: true }),
  }).lean();
  return r ? entryDTO(r as unknown as Record<string, unknown>) : undefined;
}

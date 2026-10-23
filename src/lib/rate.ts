import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { db } from "./db";
import { Rate } from "@/models";
import { HttpError } from "./http";
export async function throttle(
  req: NextRequest,
  scope: string,
  limit: number,
  seconds = 900,
) {
  await db();
  const identity = req.headers.get("x-real-ip") || "shared-local";
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = createHash("sha256")
    .update(`${scope}:${identity}:${bucket}`)
    .digest("hex");
  let record;
  try {
    record = await Rate.findOneAndUpdate(
      { _id: key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((bucket + 2) * seconds * 1000) },
      },
      { upsert: true, returnDocument: "after" },
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      record = await Rate.findOneAndUpdate(
        { _id: key },
        { $inc: { count: 1 } },
        { returnDocument: "after" },
      );
    else throw error;
  }
  if (!record || record.count > limit)
    throw new HttpError(429, "Too many attempts. Please try again later.");
}

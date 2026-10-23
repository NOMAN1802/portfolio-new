import { v2 as cloudinary } from "cloudinary";
export function cloud() {
  for (const key of [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ])
    if (!process.env[key] || process.env[key]!.includes("REPLACE"))
      throw new Error("Cloudinary is not configured");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}
export const formats = ["jpg", "jpeg", "png", "webp", "avif", "pdf"];

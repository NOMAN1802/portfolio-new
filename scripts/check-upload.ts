/** Upload a generated test fixture, verify it, then remove only that fixture. */
import { randomBytes, randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import assert from "node:assert/strict";
import { cloud } from "../src/lib/media";
function crc32(data: Buffer) {
  let c = 0xffffffff;
  for (const b of data) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const name = Buffer.from(type),
    length = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
async function main() {
  const width = 1250,
    height = 1250,
    rowSize = width * 4 + 1,
    raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0;
    randomBytes(width * 4).copy(raw, y * rowSize + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  assert.ok(png.length > 4.5 * 1024 * 1024);
  assert.ok(png.length < 10 * 1024 * 1024);
  const c = cloud(),
    publicId = `emon-portfolio/verification-${randomUUID()}`;
  let uploaded = false;
  try {
    const params = {
      timestamp: Math.floor(Date.now() / 1000),
      public_id: publicId,
      upload_preset:
        process.env.CLOUDINARY_UPLOAD_PRESET || "emon_portfolio_signed",
      overwrite: false,
    };
    const form = new FormData();
    for (const [key, value] of Object.entries(params))
      form.append(key, String(value));
    form.append("api_key", process.env.CLOUDINARY_API_KEY!);
    form.append(
      "signature",
      c.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!),
    );
    form.append(
      "file",
      new Blob([new Uint8Array(png)], { type: "image/png" }),
      "generated-verification.png",
    );
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: form },
    );
    if (!response.ok) throw new Error("Provider rejected signed upload");
    uploaded = true;
    const asset = await c.api.resource(publicId, { resource_type: "image" });
    assert.equal(asset.format, "png");
    assert.ok(asset.bytes > 4.5 * 1024 * 1024);
    assert.equal(asset.width, width);
    console.log(
      `PASS: ${(png.length / 1024 / 1024).toFixed(2)} MB signed direct upload and provider metadata verification.`,
    );
  } finally {
    if (uploaded) {
      await c.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      });
      console.log(
        "Generated verification asset removed. No portfolio media changed.",
      );
    }
  }
}
main().catch(() => {
  console.error("Signed upload verification failed.");
  process.exitCode = 1;
});

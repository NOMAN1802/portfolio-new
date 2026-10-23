/** Read-only provider checks. Does not send email or upload media. */
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { cloud } from "../src/lib/media";
async function main() {
  let failed = false;
  try {
    await mongoose.connect(process.env.DB_URL!, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log("MongoDB Atlas: connected");
  } catch {
    failed = true;
    console.error("MongoDB Atlas: connection failed");
  } finally {
    await mongoose.disconnect();
  }
  try {
    const c = cloud();
    await c.api.ping();
    const preset = await c.api.upload_preset(
      process.env.CLOUDINARY_UPLOAD_PRESET || "emon_portfolio_signed",
    );
    const options = preset.settings || {};
    if (options.unsigned === true || preset.unsigned === true)
      throw new Error();
    console.log("Cloudinary: connected; signed upload preset found");
  } catch {
    failed = true;
    console.error("Cloudinary: provider or preset verification failed");
  }
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== "false",
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_APP_PASS,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
    await transport.verify();
    transport.close();
    console.log("SMTP: authentication verified (no email sent)");
  } catch {
    failed = true;
    console.error(
      "SMTP: authentication or connectivity failed (no email sent)",
    );
  }
  if (failed) process.exitCode = 1;
}
main().catch(() => {
  console.error("Service checks could not complete.");
  process.exitCode = 1;
});

import nodemailer from "nodemailer";
import { Message } from "@/models";
export async function notify(id: string) {
  const record = await Message.findById(id);
  if (!record) return;
  const recipient = process.env.CONTACT_RECEIVER_EMAIL;
  if (!recipient || !process.env.SENDER_EMAIL || !process.env.SENDER_APP_PASS) {
    record.notification = "failed";
    await record.save();
    return false;
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
    await transport.sendMail({
      from: process.env.SENDER_EMAIL,
      to: recipient,
      replyTo: record.email,
      subject: `Portfolio inquiry: ${record.service}`,
      text: `Name: ${record.name}\nEmail: ${record.email}\nService: ${record.service}\n\n${record.message}`,
    });
    record.notification = "sent";
    await record.save();
    return true;
  } catch {
    record.notification = "failed";
    await record.save();
    return false;
  }
}

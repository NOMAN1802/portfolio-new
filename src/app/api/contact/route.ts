import { endpoint, body, HttpError } from "@/lib/http";
import { contactSchema } from "@/lib/content";
import { throttle } from "@/lib/rate";
import { Message } from "@/models";
import { notify } from "@/lib/mail";
export const runtime = "nodejs";
export const POST = endpoint(async (req) => {
  const input = contactSchema.parse(await body(req));
  if (input.website)
    throw new HttpError(400, "Unable to accept this submission.");
  await throttle(req, "contact", 5, 3600);
  const message = await Message.create({
    name: input.name,
    email: input.email,
    service: input.service,
    message: input.message,
  });
  await notify(String(message._id));
  return {
    ok: true,
    message: "Your inquiry has been received. Thank you for reaching out.",
  };
}, true);

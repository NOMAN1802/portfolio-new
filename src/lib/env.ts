import { z } from "zod";
export function configured() {
  return !!process.env.DB_URL && !process.env.DB_URL.includes("REPLACE");
}
const secret = z
  .string()
  .min(32)
  .refine((v) => !v.includes("REPLACE"), "Replace placeholder secret");
const schema = z.object({
  DB_URL: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  APP_URL: z.url(),
  JWT_ACCESS_SECRET: secret,
  JWT_REFRESH_SECRET: secret,
  JWT_ACCESS_EXPIRES_IN: z.string().default("1d"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
});
export function env() {
  const result = schema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      `Server configuration requires valid values for: ${[...new Set(result.error.issues.map((i) => i.path[0]))].join(", ")}`,
    );
  if (result.data.JWT_ACCESS_SECRET === result.data.JWT_REFRESH_SECRET)
    throw new Error("Use separate access and refresh secrets");
  return result.data;
}
export function appUrl() {
  return process.env.APP_URL || "http://127.0.0.1:5000";
}

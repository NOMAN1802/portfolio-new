import mongoose from "mongoose";
import { configured } from "./env";
const cache = globalThis as typeof globalThis & {
  mongoPromise?: Promise<typeof mongoose>;
};
export async function db() {
  if (!configured())
    throw new Error(
      "Database is not configured. Add DB_URL to your environment.",
    );
  if (!cache.mongoPromise)
    cache.mongoPromise = mongoose
      .connect(process.env.DB_URL!, {
        maxPoolSize: 5,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 8000,
        bufferCommands: false,
      })
      .catch((error) => {
        cache.mongoPromise = undefined;
        throw error;
      });
  return cache.mongoPromise;
}

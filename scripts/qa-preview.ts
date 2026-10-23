/** Disposable local UI test environment. Never used by the deployed app. */
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
async function main() {
  const mongo = await MongoMemoryServer.create({
    instance: { dbName: "emon_ui_test" },
  });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    DB_URL: mongo.getUri("emon_ui_test"),
    APP_URL: "http://127.0.0.1:5012",
    JWT_ACCESS_SECRET: "qa-only-access-secret-at-least-32-characters",
    JWT_REFRESH_SECRET: "qa-only-refresh-secret-at-least-32-characters",
    BCRYPT_SALT_ROUNDS: "10",
    ADMIN_BOOTSTRAP_ENABLED: "true",
    ADMIN_EMAIL: "qa@example.com",
    ADMIN_PASSWORD: "qa-only-password-2026",
    ADMIN_NAME: "QA Administrator",
    CLOUDINARY_API_SECRET: "",
    SENDER_APP_PASS: "",
    SENDER_EMAIL: "",
    CONTACT_RECEIVER_EMAIL: "",
  };
  await promisify(execFile)(
    process.execPath,
    ["--import", "tsx", "scripts/seed.ts"],
    { env, timeout: 20000 },
  );
  const client = new MongoClient(mongo.getUri("emon_ui_test"));
  await client.connect();
  await client
    .db("emon_ui_test")
    .collection("portfolio_adminuser")
    .updateOne(
      { email: env.ADMIN_EMAIL },
      { $set: { mustChangePassword: false } },
    );
  await client.close();
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      "5012",
    ],
    { env, stdio: "inherit" },
  );
  console.log(
    "Disposable QA only: http://127.0.0.1:5012/admin/login — qa@example.com / qa-only-password-2026",
  );
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    server.kill("SIGTERM");
    await mongo.stop();
    process.exit();
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  server.on("exit", stop);
}
main().catch(() => {
  console.error("QA preview failed to start.");
  process.exitCode = 1;
});

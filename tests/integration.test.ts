import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { defaultSettings, blankEntry } from "../src/lib/content";
const origin = "http://127.0.0.1:5011";
// This suite owns a fresh disposable database and child production server.
// No supplied Atlas URI or SMTP/Cloudinary credentials are used.
test("isolated production API workflow", { timeout: 180000 }, async (t) => {
  const mongo = await MongoMemoryServer.create({
    binary: { downloadDir: "/tmp/emon-mongodb-binaries" },
    instance: { dbName: "emon_portfolio_test" },
  });
  const settings: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    DB_URL: mongo.getUri("emon_portfolio_test"),
    APP_URL: origin,
    JWT_ACCESS_SECRET: "test-access-secret-only-32-characters-long",
    JWT_REFRESH_SECRET: "test-refresh-secret-only-32-characters-long",
    BCRYPT_SALT_ROUNDS: "10",
    ADMIN_BOOTSTRAP_ENABLED: "true",
    ADMIN_EMAIL: "admin@example.com",
    ADMIN_PASSWORD: "initial-test-password",
    ADMIN_NAME: "Test Administrator",
    CLOUDINARY_API_SECRET: "",
    SENDER_APP_PASS: "",
    SENDER_EMAIL: "",
    CONTACT_RECEIVER_EMAIL: "",
  };
  const seed = async () => {
    await promisify(execFile)(
      process.execPath,
      ["--import", "tsx", "scripts/seed.ts"],
      { env: settings, timeout: 20000 },
    );
    return { status: 0 };
  };
  let server: ReturnType<typeof spawn> | undefined;
  const client = new MongoClient(mongo.getUri("emon_portfolio_test"));
  try {
    assert.equal((await seed()).status, 0, "first bootstrap succeeds");
    assert.equal((await seed()).status, 0, "second bootstrap succeeds");
    await client.connect();
    const database = client.db("emon_portfolio_test");
    assert.equal(
      await database.collection("portfolio_adminuser").countDocuments(),
      1,
    );
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "-H",
        "127.0.0.1",
        "-p",
        "5011",
      ],
      { env: settings, stdio: ["ignore", "pipe", "pipe"] },
    );
    let output = "";
    server!.stdout?.on("data", (d) => {
      output += d.toString();
    });
    server!.stderr?.on("data", (d) => {
      output += d.toString();
    });
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try {
        const r = await fetch(origin + "/admin/login");
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {}
      await delay(250);
    }
    assert.ok(ready, `test server starts: ${output.slice(-500)}`);
    let jar: Record<string, string> = {};
    async function request(
      path: string,
      method = "GET",
      value?: unknown,
      custom?: {
        origin?: string;
        cookies?: Record<string, string>;
        store?: boolean;
      },
    ) {
      const response = await fetch(origin + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Origin: custom?.origin || origin,
          Cookie: Object.entries(custom?.cookies || jar)
            .map(([k, v]) => `${k}=${v}`)
            .join("; "),
        },
        ...(value === undefined ? {} : { body: JSON.stringify(value) }),
      });
      if (custom?.store !== false)
        for (const cookie of response.headers.getSetCookie()) {
          const [pair] = cookie.split(";");
          const index = pair.indexOf("=");
          jar[pair.slice(0, index)] = pair.slice(index + 1);
        }
      const type = response.headers.get("content-type");
      return {
        status: response.status,
        data: type?.includes("application/json")
          ? await response.json()
          : await response.text(),
      };
    }
    await t.test(
      "private APIs reject anonymous requests and forged origins",
      async () => {
        assert.equal((await request("/api/admin/settings")).status, 401);
        assert.equal(
          (
            await request(
              "/api/auth/login",
              "POST",
              {
                email: settings.ADMIN_EMAIL,
                password: settings.ADMIN_PASSWORD,
              },
              { origin: "https://evil.example" },
            )
          ).status,
          403,
        );
      },
    );
    await t.test(
      "initial password must be replaced and sessions are revoked",
      async () => {
        assert.equal(
          (
            await request("/api/auth/login", "POST", {
              email: settings.ADMIN_EMAIL,
              password: settings.ADMIN_PASSWORD,
            })
          ).status,
          200,
        );
        assert.equal((await request("/api/admin/settings")).status, 403);
        assert.equal(
          (
            await request("/api/auth/change-password", "POST", {
              currentPassword: settings.ADMIN_PASSWORD,
              password: "replacement-test-password",
            })
          ).status,
          200,
        );
        assert.equal((await request("/api/auth/me")).status, 401);
        assert.equal(
          (
            await request("/api/auth/login", "POST", {
              email: settings.ADMIN_EMAIL,
              password: "replacement-test-password",
            })
          ).status,
          200,
        );
        assert.equal((await request("/api/admin/settings")).status, 200);
      },
    );
    await t.test(
      "bootstrap preserves password changes and edited settings",
      async () => {
        assert.equal(
          (
            await request("/api/admin/settings", "POST", {
              ...defaultSettings,
              headline: "Verified content\nfrom the database.",
            })
          ).status,
          200,
        );
        assert.equal((await seed()).status, 0);
        assert.equal(
          (await request("/api/admin/settings")).data.data.headline,
          "Verified content\nfrom the database.",
        );
        assert.equal(
          (
            await request("/api/auth/login", "POST", {
              email: settings.ADMIN_EMAIL,
              password: settings.ADMIN_PASSWORD,
            })
          ).status,
          401,
        );
      },
    );
    await t.test(
      "services, skills, and experience support validated CRUD",
      async () => {
        for (const kind of ["services", "skills", "experience"]) {
          const values = {
            ...blankEntry,
            title: `Test ${kind}`,
            slug: `test-${kind}`,
            status: "published",
            order: 7,
          };
          const created = await request(`/api/admin/${kind}`, "POST", values);
          assert.equal(created.status, 200);
          const id = created.data.data._id;
          const updated = await request(`/api/admin/${kind}/${id}`, "PATCH", {
            ...values,
            order: 2,
            visible: false,
          });
          assert.equal(updated.status, 200);
          assert.equal(updated.data.data.order, 2);
          assert.equal(updated.data.data.visible, false);
          assert.equal(
            (await request(`/api/admin/${kind}/${id}`, "DELETE", {})).status,
            200,
          );
        }
      },
    );
    await t.test(
      "media ownership and in-use deletion are enforced",
      async () => {
        assert.equal(
          (
            await request("/api/admin/media", "POST", {
              publicId: "not-owned",
              alt: "Test",
            })
          ).status,
          400,
        );
        const url =
          "https://res.cloudinary.com/test/image/upload/owned-test.png";
        const asset = await database
          .collection("portfolio_mediaasset")
          .insertOne({
            publicId: "owned-test",
            url,
            alt: "Test image",
            format: "png",
            bytes: 100,
          });
        assert.equal(
          (
            await request(`/api/admin/media/${asset.insertedId}`, "PATCH", {
              alt: "Updated test description",
            })
          ).status,
          200,
        );
        const current = (await request("/api/admin/settings")).data.data;
        assert.equal(
          (
            await request("/api/admin/settings", "POST", {
              ...current,
              portrait: url,
            })
          ).status,
          200,
        );
        assert.equal(
          (await request(`/api/admin/media/${asset.insertedId}`, "DELETE", {}))
            .status,
          409,
        );
        await request("/api/admin/settings", "POST", current);
      },
    );
    let id = "";
    await t.test(
      "drafts remain private, validated writes publish and unpublish correctly",
      async () => {
        const data = {
          ...blankEntry,
          title: "Integration case study",
          slug: "integration-case-study",
          featured: true,
          summary: "Verified integration test content",
        };
        const created = await request("/api/admin/projects", "POST", data);
        assert.equal(created.status, 200);
        id = created.data.data._id;
        assert.equal(
          (await request("/projects/integration-case-study")).status,
          404,
        );
        const page = await request(
          "/projects/integration-case-study?preview=1",
        );
        assert.equal(page.status, 200);
        assert.ok(page.data.includes("AUTHENTICATED DRAFT PREVIEW"));
        assert.equal(
          (await request("/api/admin/projects", "POST", data)).status,
          409,
        );
        assert.equal(
          (
            await request(`/api/admin/projects/${id}`, "PATCH", {
              ...data,
              link: "javascript:alert(1)",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(`/api/admin/projects/${id}`, "PATCH", {
              ...data,
              status: "published",
            })
          ).status,
          200,
        );
        assert.equal(
          (await request("/projects/integration-case-study")).status,
          200,
        );
        assert.equal(
          (
            await request(`/api/admin/projects/${id}`, "PATCH", {
              ...data,
              status: "published",
              visible: false,
            })
          ).status,
          200,
        );
        assert.equal(
          (await request("/projects/integration-case-study")).status,
          404,
        );
        assert.equal(
          (await request(`/api/admin/projects/${id}`, "DELETE", {})).status,
          200,
        );
      },
    );
    await t.test(
      "inquiries survive email failure and inbox controls persist",
      async () => {
        const input = {
          name: "Integration Visitor",
          email: "visitor@example.com",
          service: "GA4 setup",
          message:
            "I need help testing a complete conversion measurement setup.",
          website: "",
        };
        assert.equal(
          (
            await request("/api/contact", "POST", {
              ...input,
              website: "spam.example",
            })
          ).status,
          400,
        );
        assert.equal(
          (await request("/api/contact", "POST", input)).status,
          200,
        );
        const inbox = await request("/api/admin/messages");
        assert.equal(inbox.data.data.length, 1);
        const record = inbox.data.data[0];
        assert.equal(record.notification, "failed");
        assert.equal(
          (
            await request(`/api/admin/messages/${record._id}`, "PATCH", {
              read: true,
              archived: true,
            })
          ).data.data.read,
          true,
        );
        await request(`/api/admin/messages/${record._id}`, "PATCH", {
          retry: true,
        });
        assert.equal(
          (await request("/api/admin/messages")).data.data.length,
          1,
        );
        for (let i = 0; i < 4; i++)
          assert.equal(
            (await request("/api/contact", "POST", input)).status,
            200,
          );
        assert.equal(
          (await request("/api/contact", "POST", input)).status,
          429,
        );
      },
    );
    await t.test(
      "refresh rotation detects reuse and invalidates access",
      async () => {
        const old = { ...jar };
        assert.equal(
          (await request("/api/auth/refresh", "POST", {})).status,
          200,
        );
        const fresh = { ...jar };
        assert.equal(
          (
            await request(
              "/api/auth/refresh",
              "POST",
              {},
              { cookies: old, store: false },
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await request("/api/admin/settings", "GET", undefined, {
              cookies: fresh,
              store: false,
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await request("/api/auth/login", "POST", {
              email: settings.ADMIN_EMAIL,
              password: "replacement-test-password",
            })
          ).status,
          200,
        );
        const beforeLogout = { ...jar };
        await request("/api/auth/logout", "POST", {});
        assert.equal(
          (
            await request("/api/admin/settings", "GET", undefined, {
              cookies: beforeLogout,
              store: false,
            })
          ).status,
          401,
        );
      },
    );
    await t.test(
      "audit history excludes credentials and inquiry content",
      async () => {
        const logs = await database
          .collection("portfolio_auditlog")
          .find()
          .toArray();
        assert.ok(logs.length > 0);
        const serialized = JSON.stringify(logs);
        for (const sensitive of [
          settings.ADMIN_PASSWORD,
          "replacement-test-password",
          "visitor@example.com",
        ])
          assert.ok(!serialized.includes(sensitive!));
      },
    );
  } finally {
    server?.kill("SIGTERM");
    if (server)
      await new Promise<void>((resolve) => {
        if (server!.exitCode !== null) resolve();
        else {
          server!.once("exit", () => resolve());
          setTimeout(resolve, 3000);
        }
      });
    await client.close();
    await mongo.stop();
  }
});

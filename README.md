# Emon — Web Analyst Portfolio

A full stack Next.js portfolio and private content studio for Emtiaz Ahmed Emon. Built with TypeScript, React, MongoDB/Mongoose, Three.js/React Three Fiber, Motion, Cloudinary, and Nodemailer. Deployment target: Vercel.

## Run locally

Requires Node.js 20.19+ and npm. The tested local runtime is Node.js 20.20.1.

```sh
npm ci
npm run dev
```

Open [portfolio](http://127.0.0.1:5000) or [admin login](http://127.0.0.1:5000/admin/login). Use this exact origin locally; changing to `localhost` requires changing `APP_URL` as well.

The ignored `.env` has been created locally with the supplied provider settings and independently generated JWT secrets. It is not part of source control. `.env.example` contains placeholders for future setups. Do not paste credentials into README files, task logs, source code, or browser screenshots.

Without a configured `DB_URL`, the public site displays an explicit design preview and disables inquiries/admin login. With MongoDB configured, it serves only published database content and reports database failures rather than showing fake saved content.

## Initial admin setup

The requested admin account has already been provisioned in the configured Atlas database. Sign in using the account you supplied, then replace the initial password in **Account**. The new password needs at least 12 characters. Changing it signs out all sessions. No public signup or password-reset endpoint exists.

For a fresh environment only, fill in `.env` and run:

```sh
ADMIN_BOOTSTRAP_ENABLED=true npm run seed
```

The command creates indexes, the first admin, initial settings, services, skills, and **draft** example projects. It also creates the restricted signed Cloudinary preset if absent and Cloudinary credentials are configured. It does not reset existing passwords or overwrite content. Leave `ADMIN_BOOTSTRAP_ENABLED=false` afterward and remove the bootstrap password from hosted runtime secrets. Never run the seed from a Vercel build, request handler, or cold start.

## What you can manage

- Site content: branding/logo, identity, hero, about, public contact information, social links, résumé, page headings, navigation order, section order/visibility, accent color, motion settings, and SEO.
- Projects: draft/publish, visibility, featured placement, unique slugs, tools, case-study narrative, verified result rows, cover/gallery, external link, and SEO.
- Services, skills, and experience: create, edit, order, hide, and delete.
- Media: signed direct uploads, provider verification, alt descriptions, URL copy, and deletion protection for referenced assets.
- Inquiries: read/unread, archive/restore, delete, reply through your email client, and retry failed email notifications.
- Activity: content changes and security events without password/token/message-body logging.

Content settings save immediately. Projects can remain drafts and use authenticated preview links. Empty experience sections collapse rather than inventing a work history. Public contact values are initially blank because the supplied image and admin details contain different contact information; confirm and enter the public values in **Site content → Contact**.

## Commands and verification

```sh
npm run typecheck
npm run build
npm run test
npm run format
```

`npm run test` starts a disposable local MongoDB and a child production server on port 5011. Run the production build first. It never uses your Atlas database or SMTP credentials. The first run may download the official MongoDB test binary. Tests check input validation, authentication, token rotation/revocation, bootstrap idempotency, draft publishing, inbox state, contact throttling, and email-failure durability.

For a disposable browser test environment after a build:

```sh
node --import tsx scripts/qa-preview.ts
```

It starts on port 5012 with a temporary test admin and prints test-only credentials. Its database is erased when stopped, SMTP/Cloudinary writes are disabled, and its credentials are never valid in the real app. Do not expose this test process publicly.

## Structure

```text
src/app/                  Public pages, admin pages, metadata, HTTP endpoints
src/components/site.tsx   Public site and sections
src/components/admin.tsx  Content studio and editors
src/components/particles.tsx  Lazy-loaded Three.js visual
src/lib/                  Validation, persistence services, auth, media, email
src/models/               Mongoose models and indexes
scripts/seed.ts           Controlled initial provisioning
scripts/qa-preview.ts     Disposable local UI test process
scripts/check-services.ts Provider connectivity checks without sending email
```

Database collections use a `portfolio_` prefix (rate limiting uses `RATE_LIMIT_COLLECTION`). Keep this app’s Preview and Production databases separate even with collection isolation.

See [task log](TASK_LOG.md), [implementation plan](IMPLEMENTATION_PLAN.md), [Vercel deployment guide](docs/VERCEL_DEPLOYMENT.md), and [admin/operations guide](docs/ADMIN_GUIDE.md).

## Current limits

The portrait is displayed using a CSS crop of the supplied composite image. Replace it with a clean headshot through Media for the best result. The Three.js effect is an animated particle field around the portrait, not a reconstructed 3D face. Case-study examples are clearly labeled and seeded as drafts. Actual client work, public contact details, résumé, experience, and production domain still need final content.

Vercel deployment requires your own project/account and environment configuration. A successful local build does not verify deployment, production SMTP, or production networking.

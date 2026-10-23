# Deploying to Vercel

The application uses Next.js Node.js Functions, MongoDB Atlas, and Cloudinary. There is no custom Express server, static export, local upload directory, or production background worker.

## Project setup

1. Push the source and lockfile to your Git repository. Verify `.env` is ignored. This workspace did not initially contain a Git repository; do not assume a remote already exists.
2. Import the repository into Vercel with the **Next.js** preset, repository root as the root directory, `npm ci` as the install command, and `npm run build` as the build command. Keep the framework’s output directory setting.
3. Select a supported Node.js version compatible with `package.json`. Do not set a custom `PORT`, development `NODE_ENV`, static export, or a seed command as part of the build.
4. Set the function region near your Atlas cluster. Configure Atlas access for your actual Vercel network arrangement; verify from a deployed preview. Local Atlas connectivity is already checked, but does not prove Vercel access.
5. Add the domain to Vercel. Set `APP_URL` to the exact HTTPS origin used to access the app. Requests from other origins are rejected for authenticated mutations and the contact form.

## Environment configuration

Configure Preview and Production separately under Vercel Project Settings → Environment Variables. Changes require a new deployment.

| Variables | Purpose |
| --- | --- |
| `DB_URL` | Atlas URI, using a separate database for Preview |
| `APP_URL` | Exact deployment origin / final production domain |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Independent random secrets, at least 32 characters; use distinct values per environment |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Supported durations such as `1d` and `30d` |
| `BCRYPT_SALT_ROUNDS` | 12 by default |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary provider configuration; secret stays server-only |
| `CLOUDINARY_UPLOAD_PRESET` | Restricted signed preset, default `emon_portfolio_signed` |
| `UPLOAD_MAX_BYTES` | Default 10485760; keep aligned with Cloudinary preset |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Mail server configuration, default Gmail TLS on 465 |
| `SENDER_EMAIL`, `SENDER_APP_PASS` | Server-side mail sender credentials |
| `CONTACT_RECEIVER_EMAIL` | Trusted inbox receiving notifications; use a test recipient in Preview |
| `RATE_LIMIT_COLLECTION` | Shared persistent throttling, default example `portfolio_rate_limits` |
| `ADMIN_BOOTSTRAP_ENABLED` | Leave false for hosted runtime |

Bootstrap name/email/password/mobile are required only by the explicit provisioning command and do not need to be stored in the Vercel runtime. Never add `NEXT_PUBLIC_` to credential variables. Replace the credentials originally shared in chat before a public launch.

Use a stable preview domain/origin for editing tests or set `APP_URL` to the actual preview URL. Vercel environment is reflected in robots rules: Preview deployments disallow indexing. Configure Vercel deployment protection for previews as appropriate for your account.

## Provisioning

The supplied local Atlas database is already provisioned. For a separate production database, run the seed from a trusted terminal using a local ignored `.env` pointing to that database:

```sh
ADMIN_BOOTSTRAP_ENABLED=true npm run seed
```

Then restore local development values. Do not point the automated tests at production. Never seed in the build step. First login requires password replacement; existing accounts and content are preserved by future seed runs.

## Upload design

The authenticated API creates a short-lived upload intent and signs a provider-restricted upload. The browser uploads bytes directly to Cloudinary, then the API verifies ownership, provider metadata, format, and size before creating a media record. This avoids Vercel’s function request payload limit. Image/PDF uploads are capped at 10 MB by the signed Cloudinary preset and the verification step. The bootstrap creates the preset if missing; an existing preset is not overwritten, so review its signed-only, format, and file-size restrictions if it was configured manually.

Media is not saved to the Vercel filesystem. An interrupted upload may leave an unreferenced Cloudinary object; review the `emon-portfolio/` folder periodically before deleting unused files. Never remove an asset referenced by content directly from Cloudinary.

## Launch checks

- Production deployment finishes without database writes during the build.
- Public Home/About/Projects/Contact and 404 pages load over HTTPS.
- Admin login, first password replacement, logout, and session refresh work.
- A draft stays private; publish/unpublish and content edits update public pages.
- An image larger than 4.5 MB uploads directly to Cloudinary and appears in Media.
- Valid inquiries persist, notifications reach the intended inbox, and failed sends can be retried.
- Confirm public contact data, real case studies, clean portrait, social links, and SEO.
- Check 360px/768px/1440px layouts, keyboard controls, reduced motion, and WebGL fallback.
- Measure mobile Lighthouse on the production deployment. No unmeasured score is guaranteed.

## Rollback and backups

Vercel rollback restores code only, not database content or Cloudinary files. Use Atlas backups/snapshots appropriate to your cluster and verify restore into a separate database. Before a schema migration, take a database backup and record the deployment ID. Roll back code using Vercel’s deployment controls; restore data only after reviewing affected records. Keep a separate backup/export of important media.

Runtime contact email is awaited with bounded SMTP timeouts. Notification failures remain in the inquiry inbox. No process-memory queue or fire-and-forget task is assumed to survive a function response. Review the selected Vercel plan’s current function-duration limits during setup.

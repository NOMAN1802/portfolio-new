# Emtiaz Ahmed Emon — portfolio implementation plan

Prepared: 16 October 2026 (Asia/Dhaka)

Status: application implemented locally. Automated tests, production build, Atlas connectivity, signed Cloudinary transfer and SMTP authentication verified. Vercel deployment, full delivery checks, and performance profiling remain. See TASK_LOG.md for evidence and limits.

## 1. Goal and scope

Build a full stack Next.js portfolio for **Emtiaz Ahmed Emon, Web Analyst and Tracking Specialist**. Visitors can learn about his expertise, explore case studies, and send inquiries. A private admin panel controls all portfolio content without editing source code.

Core expertise to feature: Google Tag Manager, GA4, Conversion API, Meta Pixel, server-side tracking, and conversion measurement. Confirm the intended meaning of “OCT” in the supplied mockup before publishing it. Do not invent client names, performance results, testimonials, or experience dates.

This delivery covers the implementation plan, task breakdown, log system, and environment variable template. Building and deploying the application are later tasks.

## 2. Reference review and visual direction

Reviewed all six screenshots in `assest/` and the attached WhatsApp mockup. The live ThemeForest preview could not be fetched; no live animations or interactions have been verified.

- Use the Axevia screenshots as visual inspiration: near-black surfaces, off-white condensed headings, monospace labels, thin borders, numbered navigation, spacious project rows, and a subtle particle background.
- Personalize the hero with Emon’s name, portrait, “Web Analyst,” and “Unlocking High ROI.” Use restrained orange and indigo accents from his mockup. The default proposal is a dark site rather than the mockup’s full orange background.
- Retain the mockup’s content hierarchy: identity, specialization, recent projects, and contact details. Convert its project tables into readable case studies with optional structured result rows.
- Public navigation: Home, About, Projects, Contact. Skills and Experience appear on Home/About. Dedicated project detail pages support sharing and search indexing.
- Adapt the contact form to analytics work: GA4/GTM setup, server-side tracking, Meta CAPI, audits, and other inquiries.
- The screenshots’ blog is outside the initial requested scope; add it later if required.
- Build original components and effects. Do not reuse the theme’s source code or stock portrait.
- Use a supplied clean portrait if available; the annotated composite image can serve as a reference, but an isolated portrait will produce a better particle effect.

## 3. Architecture

| Layer | Proposed implementation |
| --- | --- |
| Application | Next.js App Router + TypeScript; one app with public pages, admin routes, and Route Handlers |
| Database | MongoDB Atlas with Mongoose; reusable connection promise and explicit indexes |
| Server runtime | Node.js for database, authentication, Cloudinary, and email code |
| UI | React, Tailwind CSS, accessible reusable form and navigation components |
| 3D | Three.js through React Three Fiber; optional Drei helpers where useful |
| Motion | Motion for React for menu, page, and section transitions |
| Validation | Zod on the server, with shared client schemas where appropriate |
| Admin forms | React Hook Form; field errors, pending states, unsaved-change feedback |
| Authentication | bcrypt password hashes; signed access/refresh JWTs in HttpOnly cookies; revocable sessions |
| Media | Cloudinary for portrait, project screenshots, and optional public résumé PDF |
| Email | Nodemailer with server-side SMTP credentials |
| Verification | Type checking, production build, focused integration tests, Playwright browser flows |
| Hosting | Vercel with Next.js Node.js Functions; MongoDB Atlas and Cloudinary remain external services |

Use compatible stable dependency releases at setup and commit the lockfile. Do not choose exact versions before verifying package compatibility.

Mongoose requires the Node.js runtime and does not support Next.js Edge Runtime: [official Mongoose guidance](https://mongoosejs.com/docs/nextjs.html). Next.js Route Handlers provide the app’s HTTP endpoints: [official route documentation](https://nextjs.org/docs/app/api-reference/file-conventions/route). Authentication cookies can be managed in Route Handlers: [official cookies documentation](https://nextjs.org/docs/app/api-reference/functions/cookies).

Do not introduce a separate Express server for this scope. Server Components read shared services directly; browser mutations use authenticated Route Handlers. Keep database and secrets out of client bundles.

### Proposed source layout

```text
src/
  app/
    (public)/                 # Home, about, projects/[slug], contact
    admin/
      login/
      (protected)/            # Dashboard and content editors
    api/
      auth/                   # Login, refresh, logout, password change
      admin/                  # Protected content, media, inbox APIs
      contact/                # Public inquiry submission
    sitemap.ts
    robots.ts
  components/
    public/
    admin/
    three/
    ui/
  lib/                        # DB, environment, auth, mail, media, validation
  models/                     # Mongoose models
  services/                   # Shared content and publishing logic
  types/
scripts/                      # Explicit seed/bootstrap command
tests/
public/                       # Approved local assets and static fallbacks
docs/                         # Operational documentation
```

## 4. Public pages and admin controls

| Public feature | Admin controls |
| --- | --- |
| Header/navigation/footer | Brand name, logo, menu labels/order, links, footer copy |
| Hero | Name, title, headline, summary, portrait, CTAs, availability, verified statistics |
| About | Biography blocks, portrait, résumé, location, introduction |
| Services | Titles, descriptions, icons from an approved icon set, ordering, visibility |
| Skills | Name, category, icon, optional proficiency label, ordering, visibility |
| Experience | Role, organization, dates, current-role flag, description, ordering |
| Projects | Title, slug, category, tools, cover/gallery, challenge, solution, outcome, metric rows, links, featured/order/publish controls |
| Contact | Public email/phone/WhatsApp, social links, form introduction, service choices |
| SEO | Default and per-page/project title, description, social preview image |
| Theme and motion | Approved accent choices, hero effect toggle/intensity, section visibility/order |

“All content editable” includes headings, CTA text, imagery, navigation, contact details, and SEO. Layout components and executable code stay in source control; admin editors use structured fields and a limited set of safe block types.

Admin-only features: dashboard counts from real records, media library, inquiry inbox with read/archive status, profile/password settings, and content change audit history. Contact settings and the admin login identity are separate records. The supplied mockup and environment data have different contact numbers/emails; public values must be confirmed before launch.

## 5. Data model breakdown

| Collection | Main fields and rules |
| --- | --- |
| AdminUser | name, normalized unique email, passwordHash, mobile, role, active, mustChangePassword; never return hash |
| AuthSession | userId, refresh-token hash, token family/session ID, expiry, revocation; TTL cleanup index |
| SiteSettings | singleton key, branding, navigation, hero, about, contact, social links, SEO, theme, section order/visibility |
| Service | title, description, iconKey, order, visibility |
| Skill | name, category, iconKey, proficiencyLabel, order, visibility |
| Experience | role, organization, start/end, current, description, order, visibility |
| Project | unique slug, title, summary, category, tools, media refs, case-study blocks, metric rows, links, status, featured, order, SEO |
| MediaAsset | provider publicId, secure URL, type, size, dimensions, alt text, usage references |
| ContactMessage | name, email, service, message, optional budget, read/archive state, email notification status, timestamps |
| AuditLog | actor ID, action, entity type/ID, changed field names, timestamp; exclude secrets and message bodies |

All mutable records have timestamps. Slugs are validated and unique. Public queries return published/visible records only and explicitly select safe fields. Use structured plain text or sanitized limited rich text, not executable HTML.

Initial workflow: projects support draft, authenticated preview, publish, and unpublish. Settings and other sections use explicit Save to publish, with no implied revision history. Full settings drafts and revision rollback can be added later.

## 6. API and publishing behavior

- `/api/auth/login`, `/refresh`, `/logout`, `/me`, and `/change-password`: session lifecycle and account settings.
- `/api/admin/settings`: validated singleton settings read/update.
- `/api/admin/projects` and `/[id]`: paginated list, create, edit, delete, publish/unpublish, and ordering.
- Equivalent protected resource endpoints for services, skills, and experience.
- `/api/admin/media`: validated authenticated uploads, paginated library, safe removal of unused media.
- `/api/admin/messages` and `/[id]`: inbox list, view, read/archive/delete actions.
- `/api/contact`: public validated inquiry creation with durable storage before email notification.
- No public endpoint creates admins or exposes drafts, inbox records, audit entries, or auth sessions.
- Return consistent validation/error responses. Enforce authorization inside every protected handler/service, even if the page layout already checks login.
- Refresh cookies are rotated; logout, password changes, and detected refresh-token reuse revoke affected sessions. Check session validity so logout can invalidate otherwise unexpired access tokens.
- Protect mutations with same-origin checks/CSRF protection; use HttpOnly, SameSite cookies and Secure cookies in production. Apply shared persistent throttling to login/contact endpoints, rather than per-process memory only.
- Public pages initially render published database content on the server with explicit dynamic reads. This avoids stale CMS edits; add caching only with a tested invalidation path.
- Draft previews require authentication and bypass public indexing/caching. Deleted/unpublished project pages return 404.
- A contact inquiry remains saved if SMTP fails. Show a truthful received state, mark notification failure in the inbox, and allow an admin retry without duplicating the inquiry.

## 7. Animation and accessibility plan

1. Render meaningful hero text and a static portrait first; lazy-load the Three.js canvas in a client component.
2. Create one hero particle portrait or analytics-inspired particle field with subtle pointer response. If the portrait input is insufficient, use the particle field until a clean image is provided.
3. Use short entrance/reveal animations, menu transitions, and project hover feedback. Avoid scroll hijacking and a mandatory loading screen.
4. Cap rendering resolution/particle counts for smaller devices; pause offscreen/background animation and dispose GPU resources on unmount.
5. Honor reduced-motion settings, support WebGL failure with a static visual, and expose an admin motion toggle.
6. Keep text outside canvas for search and accessibility. Support keyboard navigation, focus trapping/return for overlays, visible focus, form labels, and readable contrast.

## 8. Step-by-step implementation backlog

Tasks are performed in this order. Complete the stated check before marking a task done, then append a dated entry to `TASK_LOG.md`. Checkboxes below are the detailed backlog; the log records evidence and actual outcomes.

### Phase 1 — foundation

- [x] **T01** Scaffold Next.js/TypeScript, styling, scripts, lockfile, and source structure. Check: development server renders on port 5000 and the initial production build passes.
- [x] **T02** Implement server-only environment validation and setup README. Check: missing/malformed required values produce actionable errors without leaking values.
- [x] **T03** Establish design tokens, typography, responsive grid, and reusable controls. Check: desktop/mobile shell and keyboard focus are readable.

### Phase 2 — database and bootstrap

- [x] **T04** Add reusable Mongoose connection and core content models/indexes. Check: development restarts reuse connections; validation and uniqueness are exercised against a test database.
- [x] **T05** Implement an explicit idempotent admin bootstrap command and clearly labeled starter content. Check: the first controlled run creates one admin; subsequent runs neither duplicate it nor reset its password or overwrite edits. Never seed during Vercel builds or function cold starts.
- [x] **T06** Add shared data services, safe DTOs, and error handling. Check: public reads exclude unpublished content and private fields.

### Phase 3 — admin authentication

- [x] **T07** Build login, bcrypt verification, cookie JWTs, refresh rotation, and logout. Check: valid/invalid login, expiration, refresh reuse, and revocation work.
- [x] **T08** Protect admin pages and every write/read API for private data; add CSRF/origin checks and persistent throttling. Check: anonymous, expired-session, and cross-origin requests are rejected.
- [x] **T09** Build account/password settings and require initial password replacement. Check: password changes revoke other sessions; submitted passwords never appear in logs.

### Phase 4 — admin shell and media

- [x] **T10** Build responsive admin navigation, dashboard, loading/empty/error states. Check: counts come from stored records and mobile navigation works.
- [x] **T11** Implement authenticated signed direct-to-Cloudinary uploads and media library. Check: the server limits signed parameters and verifies completed assets with Cloudinary before storing references; provider-enforced format/size restrictions reject invalid assets; unverified uploads never become published media. Test images/PDFs above 4.5 MB without sending file bytes through Vercel Functions; API secrets stay server-side.
- [x] **T12** Add alt text and safe asset replacement/deletion. Check: referenced assets cannot be accidentally deleted and failed replacements preserve the previous content reference.

### Phase 5 — editable portfolio content

- [x] **T13** Build branding, hero, about, contact, navigation, SEO, theme, and section editors. Check: saved values survive reload and validate URLs/lengths.
- [x] **T14** Build services/skills CRUD with ordering and visibility. Check: edit/delete/reorder/empty states work without data loss.
- [x] **T15** Build experience CRUD with date/current-role validation. Check: invalid date ranges fail and intended ordering persists.
- [x] **T16** Record content changes in the audit log. Check: actor/entity/action appear without credentials or sensitive payloads.

### Phase 6 — projects and case studies

- [x] **T17** Build project CRUD, gallery, tools, case-study sections, metrics, and unique slugs. Check: validation rejects invalid links and duplicate slugs.
- [x] **T18** Add draft preview, publish/unpublish, featured flag, and ordering. Check: drafts are admin-only; public visibility reflects state changes.
- [x] **T19** Build public project list/filter and detail pages. Check: filters work, cards link correctly, hidden records are absent, invalid slugs return 404.

### Phase 7 — public portfolio

- [x] **T20** Build hero, portrait, CTAs, navigation overlay, and footer from database content. Check: mobile/desktop layouts and keyboard navigation work.
- [x] **T21** Build About, services, skills, and experience sections/pages. Check: edits, visibility, and ordering match admin values.
- [x] **T22** Connect recent/featured projects and contact CTAs. Check: real published content appears; empty sections collapse cleanly.

### Phase 8 — Three.js and motion

- [x] **T23** Implement the particle hero with static and WebGL-error fallbacks. Check: page remains usable with WebGL unavailable.
- [x] **T24** Add transitions, reveals, and hover interactions. Check: reduced motion disables unnecessary effects and overlay focus remains correct.
- [ ] **T25** Tune GPU/memory behavior and mobile effect density. Check: canvas pauses when hidden and repeated navigation does not accumulate renderers/listeners.

### Phase 9 — contact workflow

- [x] **T26** Build public form, validation, honeypot, persistent rate limiting, and durable message storage. Check: invalid/spam submissions are rejected and valid submissions create one message.
- [ ] **T27** Add SMTP notification and admin inbox/read/archive/retry controls. Check: successful send, send failure, and retry preserve accurate status without duplicate inquiries. Recipient comes from trusted server/admin settings.

### Phase 10 — SEO and delivery quality

- [x] **T28** Add editable metadata, canonical URLs, social images, sitemap, robots, and appropriate structured data. Check: published projects are indexed; admin/preview pages use noindex and stay protected.
- [x] **T29** Optimize images/fonts and check accessibility/responsive layouts. Check: 360px, 768px, and 1440px layouts; keyboard menu/forms; no horizontal overflow.
- [ ] **T30** Measure performance and tune heavy assets. Target: mobile Lighthouse performance at least 85 and accessibility at least 95 on a representative production preview; record measured results and device/network limits rather than claiming an unmeasured score.

### Phase 11 — verification

- [x] **T31** Run focused integration tests for authorization, token rotation, bootstrap idempotency, content validation, publication, uploads, and contact failure handling. Use a dedicated test DB, never production data.
- [ ] **T32** Run browser flows: login → change password → edit hero → create/upload/publish project → verify public page → submit inquiry → review inbox → logout. Include unauthorized API attempts and mobile/reduced-motion flows.
- [x] **T33** Run type checking and production build; resolve observed failures. Check: record exact commands/results in the task log and inspect the actual production server.

### Phase 12 — deployment and handover

- [ ] **T34** Prepare Vercel Git integration, Next.js build settings, a supported Node.js version, function region near Atlas, separate Preview/Production secrets and databases, Atlas connectivity, HTTPS/cookies, and an explicit bootstrap command. Check: builds do not mutate production data; preview deployments cannot edit production content; secrets are absent from source/build outputs.
- [ ] **T35** Deploy to Vercel, run controlled admin bootstrap from a trusted terminal with production secrets, configure the production domain/APP_URL, and perform live smoke checks. Check: login, content edit, direct media upload above 4.5 MB, project publish, inquiry storage/email, and logout work over HTTPS; SMTP failures remain recoverable from the inbox.
- [ ] **T36** Deliver admin guide, environment guide, backup/restore procedure, rollback notes, and final status log. Check: handover lists remaining limitations and verified public/admin URLs.

## 9. Environment and bootstrap rules

- `.env.example` lists keys with placeholders. Create a local ignored `.env` during setup using working credentials; configure separate Preview and Production values in Vercel Project Settings → Environment Variables, then redeploy to apply changes. See [Vercel environment variables](https://vercel.com/docs/environment-variables).
- Keep the user-provided key names, including `DB_URL`, `BCRYPT_SALT_ROUNDS`, JWT settings, Cloudinary settings, sender credentials, and admin bootstrap settings.
- Add `APP_URL`, SMTP host/port/security, notification recipient, upload limit, bootstrap flag, and persistent rate-limit storage settings.
- `PORT=5000` configures local development only. Set the npm dev script to `next dev -p 5000` so startup does not depend on Next.js loading PORT from a dotenv file. Vercel manages routing and production execution; do not configure a custom listening port or set `NODE_ENV=development` on Vercel.
- Provision the initial admin with an explicit seed command from a trusted terminal before launch. Vercel has no single persistent “first boot”: do not seed on requests, cold starts, or builds. A unique admin email index and idempotent upsert prevent duplicates; the command never resets an existing password. Disable bootstrap and remove bootstrap password values after provisioning.
- Hash the initial password using the configured bcrypt rounds; require the first password change. Never use the sample JWT secrets in production.
- Credentials supplied in chat should be replaced before deployment. Do not copy them into planning documents, source code, public variables, logs, screenshots, or `.env.example`.
- Admin mobile/name fields are separate environment assignments. Cloudinary’s diagnostic-report comment belongs to another use case; this project stores portfolio media and an optional résumé.

## 10. Vercel deployment requirements

- Import the Git repository as a Next.js project. Use the normal Next.js production build; do not use static export because the application needs server-side authentication, database access, and APIs. No custom Express server or mandatory `vercel.json` is needed initially.
- Keep Mongoose/database handlers on the Node.js runtime. Cache connection promises within each function instance, use bounded connection pools, and recover cleanly after failed connections. This reuses warm connections but does not create one global connection shared by all instances.
- Select a function region near MongoDB Atlas and configure Atlas network access for the actual Vercel connectivity arrangement. Confirm connectivity from a deployed preview; do not assume local access proves production access.
- Upload file bytes directly from the authenticated admin browser to Cloudinary with restricted server-generated signatures. Verify provider metadata before persisting an asset. This supports the planned 10 MB media limit despite Vercel Functions’ 4.5 MB request/response payload limit: [Vercel limits](https://vercel.com/docs/functions/limitations).
- Do not persist media or application state on the function filesystem. Store content, sessions, rate-limit records, and inquiries in MongoDB and media in Cloudinary.
- Await inquiry storage and a bounded SMTP attempt within the request; do not rely on an unawaited email promise or an in-memory worker surviving the response. Save failure status for manual retry. Verify SMTP from the deployed environment.
- Use a separate preview database, non-production notification recipient, and distinct JWT secrets. Scope cookies to the deployment host; protect previews and avoid indexing them. Set `APP_URL` to the URL of the deployment being tested and to the final domain in Production; avoid permissive wildcard origin checks.
- Do not read/seed MongoDB as a build-time side effect. Database-backed portfolio pages are dynamically rendered; DB connection and required runtime-secret validation run when needed by the server.
- Review the selected Vercel plan’s function duration and resource limits at deployment. Apply bounded database/mail timeouts and use persistent rate limits across instances.
- Before promotion, verify the preview workflow; after promotion, repeat production smoke checks. Document Vercel deployment rollback separately from database backups because code rollback does not revert stored content.

## 11. Logging convention

After every completed task, update its checkbox and add an entry to `TASK_LOG.md` containing:

```text
Date/time (Asia/Dhaka):
Task ID and title:
Status: DONE | IN PROGRESS | BLOCKED
What changed:
Files affected:
Verification performed and result:
Limitations/blockers:
Next task:
```

Only mark DONE after the acceptance check passes. Record failures and unverified checks explicitly. Never log credentials, access/refresh tokens, connection strings, or inquiry message bodies. A task log describes development work; the database AuditLog describes admin content edits.

## 12. Definition of completion

The portfolio is complete when public content comes from MongoDB; all requested content is editable through authenticated admin forms; drafts stay private; Cloudinary uploads and stored/email-notified inquiries work; Three.js degrades gracefully; the full browser workflow, type check, and production build pass; and deployment plus operational handover are verified.

Deployment platform is confirmed: **Vercel**. Open inputs do not block scaffolding: clean portrait, genuine project case studies and measurable outcomes, confirmed public contact details, résumé, final social links, and production domain. Use clearly identified starter content until supplied. Do not publish placeholder claims as real achievements.

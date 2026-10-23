# Admin and operations guide

## First login

Open `/admin/login` using the exact configured site origin. Use the supplied admin identity. Change the initial password in Account before making content edits. A password change revokes all sessions and requires login again. The application has one admin role and no public registration.

If login fails, verify Atlas access, `APP_URL`, distinct JWT secrets, and that provisioning completed. Never paste passwords or connection strings into the task log. There is no email password-reset flow in this version; account recovery requires a controlled server-side intervention by the deployment owner.

## Editing content

**Site content** groups fields into Identity, Hero, About, Contact, Navigation, Appearance, SEO, and Sections. Save & publish applies changes immediately. The Sections tab controls Home section ordering/visibility and menu ordering. About/Projects dedicated pages remain reachable even when their Home section is hidden.

Upload images and PDFs to Media first. Describe each asset, then select it from an editor. Keep résumé PDFs intentional: they are public assets once linked. Replace the composite portrait with a clean headshot to avoid the CSS crop. Use full `https://` URLs for external links. JavaScript/data URLs are rejected.

**Projects** support draft/published and a separate visibility switch. Set Featured to include a published project on Home. Use the eye button for authenticated preview of drafts. Published projects have shareable `/projects/{slug}` URLs. Deleting/unpublishing removes public access. Result rows use `Label | Value`, one per line; only publish verified results. Keep Illustrative example enabled for sample work.

**Services**, **Skills**, and **Experience** use display-order values: lower numbers appear first. Switch visibility off to hide an entry. Current roles can omit an end date. No work history is invented by the application.

Unsaved edits are indicated. Browser unload and switching admin sections prompt before discarding unsaved editor state. Save before leaving an editor.

## Inquiries

A valid contact submission is saved before email is attempted. The visitor receives an accurate receipt confirmation when storage succeeds, including when SMTP fails. Inquiries display notification state separately from read/archive state. Reply by email opens your mail client; the application does not send replies itself.

Use Retry notification only for failed messages. Read and archive controls do not delete an inquiry. Permanent deletion requires the UI confirmation. At more than 50 records, pagination applies and inbox filters operate on the current page.

## Assets

Uploads are authenticated and sent directly to Cloudinary. Verification records only supported image/PDF formats within the configured size limit. Deleting an in-use asset is blocked by the API. Replace its references in draft and published content first. Alt descriptions in the library help identify images; use the portrait/cover/gallery alt fields in each editor for the public page descriptions.

## Monitoring and maintenance

- Review failed/pending email notifications in Inquiries. A function interrupted during sending can leave a pending/sending record requiring an operator to check delivery before resetting status.
- Review Activity for content changes. Entries store field names, actor IDs, entity IDs, and actions; passwords, refresh tokens, and inquiry bodies are excluded.
- Atlas holds content, sessions, inquiries, and rate-limit buckets. Session/bucket/upload-intent TTL indexes are created by provisioning. Warm function instances reuse bounded MongoDB connection pools.
- Back up Atlas and important media. Practice restoring to a separate database. Code rollback alone cannot restore deleted content.
- Rotate provider credentials in Vercel environment settings and redeploy. Rotating JWT secrets signs out existing sessions. Keep Preview secrets and data separate from Production.
- Review dependencies before upgrades; read `AGENTS.md` and the installed Next.js docs before implementation changes.

## Known boundaries

Structured forms control content, not executable code or arbitrary page layouts. Settings revisions/rollback, a blog, multi-admin roles, password-reset email, automated email retry jobs, and analytics provider account integrations are outside this version. This portfolio advertises analytics expertise; it does not automatically install visitor-tracking tags or connect to client analytics accounts.

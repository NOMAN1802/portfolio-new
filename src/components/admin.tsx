"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings2,
  FolderKanban,
  Layers,
  ChartNoAxesCombined,
  BriefcaseBusiness,
  Images,
  Mail,
  UserRound,
  History,
  ArrowUpRight,
  LogOut,
  Plus,
  ArrowLeft,
  Save,
  Trash2,
  Pencil,
  Eye,
  Upload,
  FileText,
  LoaderCircle,
  Menu,
  X,
  ArrowUp,
  ArrowDown,
  Check,
  RefreshCw,
} from "lucide-react";
import { ZodError } from "zod";
import { fontVars } from "./fonts";
import "./admin.css";

function BrandMark({ name }: { name: string }) {
  return (
    <Link className="brand-mark" href="/" aria-label={`${name} home`}>
      emon
      <i />
    </Link>
  );
}
import {
  blankEntry,
  defaultSettings,
  settingsSchema,
  entrySchema,
  kinds,
  sectionKeys,
  type Settings,
  type Entry,
  type Kind,
} from "@/lib/content";
type AdminUser = { name: string; email: string; mustChangePassword: boolean };
type Asset = {
  _id: string;
  url: string;
  alt: string;
  format: string;
  bytes: number;
  publicId: string;
};
type Inquiry = {
  _id: string;
  name: string;
  email: string;
  service: string;
  message: string;
  read: boolean;
  archived: boolean;
  notification: string;
  createdAt: string;
};
type AuditEntry = {
  _id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  fields: string[];
  createdAt: string;
};
type Tab =
  Kind | "dashboard" | "settings" | "media" | "messages" | "account" | "audit";
let refreshing: Promise<Response> | null = null;
async function api(
  path: string,
  method = "GET",
  value?: unknown,
  retry = true,
): Promise<any> {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    ...(value !== undefined ? { body: JSON.stringify(value) } : {}),
  };
  let response = await fetch(path, options);
  if (response.status === 401 && retry && !path.includes("/auth/")) {
    if (!refreshing)
      refreshing = fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).finally(() => {
        refreshing = null;
      });
    const fresh = await refreshing;
    if (fresh.ok) response = await fetch(path, options);
  }
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !path.includes("/auth/"))
      window.location.assign("/admin/login");
    throw new Error(data.error || "Request failed.");
  }
  return data;
}
export function Login({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className={`admin-root admin-login ${fontVars}`}>
      <div className="login-branding">
        <BrandMark name="Emtiaz Ahmed Emon" />
        <div>
          <p className="eyebrow">YOUR PORTFOLIO / YOUR CONTROL</p>
          <h1>
            <span className="outline">Content</span>
            Studio.
          </h1>
          <p>
            One place to shape your story, share your work, and keep the
            conversation going.
          </p>
        </div>
        <span className="mono muted">EMON / CONTENT STUDIO</span>
      </div>
      <div className="login-side">
        <div className="login-card">
          <p className="eyebrow">CONTENT STUDIO / SIGN IN</p>
          <h2>Welcome back.</h2>
          <p>Sign in to manage your portfolio.</p>
          {!configured && (
            <div className="admin-notice">
              The studio needs a database connection. Add your environment
              values and run the documented admin setup command.
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const values = Object.fromEntries(
                  new FormData(e.currentTarget),
                );
                await api("/api/auth/login", "POST", values);
                router.push("/admin");
                router.refresh();
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "Unable to sign in.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email address
              <input
                name="email"
                autoComplete="username"
                type="email"
                placeholder="your@email.com"
                maxLength={254}
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                autoComplete="current-password"
                type="password"
                placeholder="Enter your password"
                maxLength={128}
                required
              />
            </label>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <button disabled={busy || !configured} className="button primary">
              {busy ? <LoaderCircle size={17} className="spin" /> : "Sign in"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <small>
            No public registration. Your admin account is provisioned through
            the setup command.
          </small>
          <Link href="/" className="text-link" style={{ marginTop: 30 }}>
            <ArrowLeft size={14} /> Back to portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
const navigation: [Tab, string, typeof LayoutDashboard][] = [
  ["dashboard", "Overview", LayoutDashboard],
  ["settings", "Site content", Settings2],
  ["projects", "Projects", FolderKanban],
  ["services", "Services", Layers],
  ["skills", "Skills", ChartNoAxesCombined],
  ["experience", "Experience", BriefcaseBusiness],
  ["media", "Media library", Images],
  ["messages", "Inquiries", Mail],
  ["audit", "Activity log", History],
  ["account", "Account", UserRound],
];
export default function Admin() {
  const unsaved = useRef(false);
  useEffect(() => {
    const listener = (event: Event) => {
      unsaved.current = Boolean((event as CustomEvent).detail);
    };
    window.addEventListener("studio-dirty", listener);
    return () => window.removeEventListener("studio-dirty", listener);
  }, []);
  const [user, setUser] = useState<AdminUser | null>(null),
    [tab, setTab] = useState<Tab>("dashboard"),
    [open, setOpen] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let response = await fetch("/api/auth/me");
        if (response.status === 401) {
          const r = await api("/api/auth/refresh", "POST", {});
          if (alive) {
            setUser(r.user);
            if (r.user.mustChangePassword) setTab("account");
          }
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (alive) {
          setUser(data.user);
          if (data.user.mustChangePassword) setTab("account");
        }
      } catch {
        window.location.assign("/admin/login");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const select = (value: Tab) => {
    if (
      value !== tab &&
      unsaved.current &&
      !confirm("Discard unsaved changes?")
    )
      return;
    if (user?.mustChangePassword && value !== "account") {
      setNotice(
        "Change your initial password in Account before editing content.",
      );
      return;
    }
    setNotice("");
    setTab(value);
    setOpen(false);
  };
  if (!user)
    return (
      <div className={`admin-loading ${fontVars}`}>
        <LoaderCircle className="spin" size={20} />
        Opening your studio…
      </div>
    );
  return (
    <div className={`admin-root ${fontVars}`}>
      {open && (
        <button
          className="admin-backdrop"
          aria-label="Dismiss admin navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`admin-sidebar ${open ? "open" : ""}`}>
        <button
          className="sidebar-close icon-button"
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
        >
          <X size={17} />
        </button>
        <BrandMark name={user.name} />
        <p className="studio-tag">CONTENT STUDIO</p>
        <nav aria-label="Admin navigation">
          {navigation.map(([value, label, Icon]) => (
            <button
              key={value}
              className={tab === value ? "active" : ""}
              onClick={() => select(value)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" target="_blank">
            View portfolio <ArrowUpRight size={14} />
          </Link>
          <button
            onClick={async () => {
              await api("/api/auth/logout", "POST", {});
              window.location.assign("/admin/login");
            }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="mobile-admin-menu"
            aria-label={
              open ? "Close admin navigation" : "Open admin navigation"
            }
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
          <span>
            Workspace /{" "}
            <span style={{ color: "var(--text)" }}>
              {navigation.find((n) => n[0] === tab)?.[1]}
            </span>
          </span>
          <div className="user-chip">
            <span className="user-avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            {user.name}
          </div>
        </header>
        <main className="admin-body">
          {notice && (
            <div role="status" className="admin-notice">
              {notice}
            </div>
          )}
          {user.mustChangePassword && (
            <div className="admin-notice">
              Your initial password must be changed before you can manage
              content. You’ll sign in again afterward.
            </div>
          )}
          {tab === "dashboard" ? (
            <Dashboard select={select} />
          ) : tab === "settings" ? (
            <SettingsEditor />
          ) : kinds.includes(tab as Kind) ? (
            <ContentManager key={tab} kind={tab as Kind} />
          ) : tab === "media" ? (
            <MediaLibrary />
          ) : tab === "messages" ? (
            <Inbox />
          ) : tab === "audit" ? (
            <Activity />
          ) : (
            <Account user={user} />
          )}
        </main>
      </div>
    </div>
  );
}
function Heading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="admin-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
function Notice({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return message ? (
    <div
      role={error ? "alert" : "status"}
      className={`admin-notice ${error ? "error" : "success"}`}
    >
      {message}
    </div>
  ) : null;
}
function Loading() {
  return (
    <div className="admin-loading">
      <LoaderCircle size={20} className="spin" />
      Loading…
    </div>
  );
}
function Dashboard({ select }: { select: (v: Tab) => void }) {
  const [data, setData] = useState<Record<string, number> | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/api/admin/dashboard")
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <Heading
        title="Your portfolio, at a glance."
        subtitle="A clear view of your content and conversations."
      />
      <Notice message={error} error />
      {data ? (
        <>
          <div className="admin-stats">
            {[
              ["Projects", "projects", FolderKanban],
              ["Published projects", "published", Eye],
              ["Unread inquiries", "unread", Mail],
              ["Media assets", "media", Images],
            ].map(([label, key, Icon]) => {
              const I = Icon as typeof Mail;
              return (
                <div className="stat-card" key={String(key)}>
                  <div>
                    {String(label)}
                    <I size={17} />
                  </div>
                  <strong>{data[String(key)]}</strong>
                </div>
              );
            })}
          </div>
          <div className="admin-panel">
            <h2>Make your next update.</h2>
            <div className="quick-grid">
              <button onClick={() => select("projects")}>
                Manage your work
                <ArrowUpRight size={19} />
              </button>
              <button onClick={() => select("settings")}>
                Edit your story
                <ArrowUpRight size={19} />
              </button>
              <button onClick={() => select("messages")}>
                Read your inquiries
                <ArrowUpRight size={19} />
              </button>
            </div>
          </div>
          <div className="admin-panel">
            <h2>A quick publishing checklist</h2>
            <p>
              Replace starter copy with your own words, add verified case
              studies, confirm your contact details, and choose a clean
              portrait. Projects stay private until you publish them.
            </p>
            <p>
              Site content saves publish immediately. Changes to projects can be
              saved as drafts and previewed before publishing.
            </p>
          </div>
        </>
      ) : (
        !error && <Loading />
      )}
    </>
  );
}
type FieldDef = {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "checkbox"
    | "select"
    | "media"
    | "resume";
  help?: string;
  options?: string[];
  full?: boolean;
  required?: boolean;
};
const settingsGroups: Record<string, FieldDef[]> = {
  Identity: [
    { key: "brandWord", label: "Brand wordmark" },
    { key: "brandTagline", label: "Brand tagline" },
    { key: "logo", label: "Custom logo", type: "media" },
    { key: "name", label: "Full name", required: true },
    { key: "role", label: "Professional role", required: true },
    { key: "availability", label: "Availability label" },
    { key: "location", label: "Location" },
    { key: "portrait", label: "Portrait", type: "media" },
    { key: "portraitAlt", label: "Portrait alt text" },
    {
      key: "resume",
      label: "Résumé PDF or public URL",
      type: "resume",
      full: true,
    },
  ],
  Hero: [
    { key: "heroAnnotation", label: "Stats panel heading" },
    { key: "heroFlow", label: "Stats panel tagline" },
    { key: "heroFooter", label: "Stats panel note" },
    { key: "heroCoord", label: "Vertical side label" },
    {
      key: "expertiseStrip",
      label: "Expertise strip",
      full: true,
      help: "Separate phrases with commas.",
    },
    {
      key: "headline",
      label: "Hero headline",
      type: "textarea",
      help: "Use a line break to split the headline.",
      full: true,
    },
    { key: "intro", label: "Introduction", type: "textarea", full: true },
    { key: "primaryCta", label: "Contact button label" },
    { key: "secondaryCta", label: "Projects button label" },
  ],
  About: [
    { key: "aboutTitle", label: "About heading", type: "textarea", full: true },
    {
      key: "biography",
      label: "Biography",
      type: "textarea",
      full: true,
      help: "Separate paragraphs with an empty line.",
    },
  ],
  Contact: [
    { key: "email", label: "Public email" },
    { key: "phone", label: "Public phone" },
    { key: "whatsapp", label: "WhatsApp number with country code" },
    { key: "linkedin", label: "LinkedIn URL" },
    { key: "github", label: "GitHub URL" },
    { key: "facebook", label: "Facebook URL" },
    {
      key: "contactTitle",
      label: "Contact heading",
      type: "textarea",
      full: true,
    },
    {
      key: "contactIntro",
      label: "Contact introduction",
      type: "textarea",
      full: true,
    },
  ],
  Navigation: [
    { key: "headerCta", label: "Menu contact button" },
    { key: "navHome", label: "Home navigation label" },
    { key: "navAbout", label: "About navigation label" },
    { key: "navProjects", label: "Projects navigation label" },
    { key: "navContact", label: "Contact navigation label" },
    { key: "servicesTitle", label: "Services heading" },
    { key: "skillsTitle", label: "Skills heading" },
    { key: "experienceTitle", label: "Experience heading" },
    { key: "projectsTitle", label: "Projects heading" },
    { key: "footer", label: "Footer copy", full: true },
  ],
  Appearance: [
    {
      key: "accent",
      label: "Accent color",
      type: "select",
      options: ["lime", "orange", "indigo"],
    },
    {
      key: "particleIntensity",
      label: "Particle density (0.2–1)",
      type: "number",
    },
    { key: "motion", label: "Enable animations", type: "checkbox" },
  ],
  SEO: [
    { key: "seoTitle", label: "Default page title", full: true },
    {
      key: "seoDescription",
      label: "Default description",
      type: "textarea",
      full: true,
    },
    {
      key: "socialImage",
      label: "Social preview image",
      type: "media",
      full: true,
    },
  ],
};
function Field({
  field: f,
  value,
  onChange,
  assets,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  assets: Asset[];
}) {
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const isCheck = f.type === "checkbox";
  const media = f.type === "media" || f.type === "resume";
  return (
    <div className={`editor-field ${f.full ? "full" : ""}`}>
      <label className={isCheck ? "check-field" : ""}>
        {isCheck ? (
          <>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
            />
            {f.label}
          </>
        ) : (
          <>
            {f.label}
            {f.required ? " *" : ""}
            {f.type === "textarea" ? (
              <textarea
                value={String(value ?? "")}
                rows={f.key === "biography" ? 8 : 4}
                onChange={(e) => onChange(e.target.value)}
                required={f.required}
              />
            ) : f.type === "select" ? (
              <select
                value={String(value ?? "")}
                onChange={(e) => onChange(e.target.value)}
              >
                {f.options?.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : media ? (
              <>
                <input
                  value={String(value ?? "")}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={
                    f.type === "resume"
                      ? "https://…"
                      : "Choose an uploaded image"
                  }
                  aria-label={`${f.label} URL`}
                />
                <div className="picker-current">
                  {value && f.type === "media" ? (
                    <img src={String(value)} alt="Current selection" />
                  ) : null}
                  <button
                    type="button"
                    className="small-button"
                    onClick={() => setPicking(!picking)}
                  >
                    <Images size={13} />
                    {picking ? "Close library" : "Choose from library"}
                  </button>
                  <button
                    type="button"
                    className="small-button"
                    disabled={uploading}
                    onClick={() => fileInput.current?.click()}
                  >
                    {uploading ? (
                      <LoaderCircle className="spin" size={13} />
                    ) : (
                      <Upload size={13} />
                    )}
                    {uploading ? "Uploading…" : "Upload from device"}
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    hidden
                    accept={
                      f.type === "resume"
                        ? "application/pdf"
                        : "image/jpeg,image/png,image/webp,image/avif"
                    }
                    onChange={async (e) => {
                      const selected = e.target.files?.[0];
                      e.target.value = "";
                      if (!selected) return;
                      setUploading(true);
                      setUploadError("");
                      try {
                        const alt =
                          selected.name.replace(/\.[^.]+$/, "").slice(0, 200) ||
                          f.label;
                        const asset = await uploadAsset(selected, alt);
                        onChange(asset.url);
                        setPicking(false);
                      } catch (err) {
                        setUploadError(
                          err instanceof Error ? err.message : "Upload failed.",
                        );
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                  {!!value && (
                    <button
                      type="button"
                      className="small-button"
                      onClick={() => onChange("")}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {uploadError && (
                  <small role="alert" className="field-error">
                    {uploadError}
                  </small>
                )}
                {picking && (
                  <div className="media-picker">
                    {assets.filter((a) =>
                      f.type === "resume"
                        ? a.format === "pdf"
                        : a.format !== "pdf",
                    ).length ? (
                      assets
                        .filter((a) =>
                          f.type === "resume"
                            ? a.format === "pdf"
                            : a.format !== "pdf",
                        )
                        .map((a) => (
                          <button
                            key={a._id}
                            type="button"
                            className={`media-pick ${value === a.url ? "selected" : ""}`}
                            onClick={() => {
                              onChange(a.url);
                              setPicking(false);
                            }}
                          >
                            {a.format === "pdf" ? (
                              <FileText size={28} />
                            ) : (
                              <img src={a.url} alt={a.alt} />
                            )}
                            <span>{a.alt}</span>
                          </button>
                        ))
                    ) : (
                      <small>Upload assets in the Media library first.</small>
                    )}
                  </div>
                )}
              </>
            ) : (
              <input
                type={f.type || "text"}
                value={String(value ?? "")}
                onChange={(e) =>
                  onChange(
                    f.type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
                step={f.key === "particleIntensity" ? ".1" : undefined}
                required={f.required}
              />
            )}
          </>
        )}
        {f.help && <small>{f.help}</small>}
      </label>
    </div>
  );
}
function useUnsaved(dirty: boolean) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("studio-dirty", { detail: dirty }));
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => {
      window.removeEventListener("beforeunload", fn);
      window.dispatchEvent(new CustomEvent("studio-dirty", { detail: false }));
    };
  }, [dirty]);
}
// Uploads straight from the browser to Cloudinary with a server-signed ticket,
// so large files never pass through the Vercel function (4.5 MB body limit).
async function uploadAsset(selected: File, alt: string): Promise<Asset> {
  if (selected.size > 10485760)
    throw new Error("Please choose a file under 10 MB.");
  const ticket = await api("/api/admin/upload-signature", "POST", {});
  const form = new FormData();
  form.append("file", selected);
  for (const [key, value] of Object.entries(ticket.params))
    form.append(key, String(value));
  form.append("api_key", ticket.apiKey);
  form.append("signature", ticket.signature);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${ticket.cloudName}/image/upload`,
    { method: "POST", body: form },
  );
  if (!response.ok)
    throw new Error(
      "Upload failed. Check the file type and Cloudinary preset configuration.",
    );
  await response.json();
  const saved = await api("/api/admin/media", "POST", {
    publicId: ticket.params.public_id,
    alt,
  });
  return saved.data;
}
async function allAssets(): Promise<Asset[]> {
  let page = 1,
    result: Asset[] = [];
  while (page <= 50) {
    const r = await api(`/api/admin/media?page=${page}`);
    result = result.concat(r.data);
    if (result.length >= r.total || !r.data.length) break;
    page++;
  }
  return result;
}
function SettingsEditor() {
  const [data, setData] = useState<Settings | null>(null),
    [initial, setInitial] = useState(""),
    [group, setGroup] = useState("Identity"),
    [assets, setAssets] = useState<Asset[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([api("/api/admin/settings"), allAssets()])
      .then(([r, a]) => {
        setData(r.data);
        setInitial(JSON.stringify(r.data));
        setAssets(a);
      })
      .catch((e) => {
        setError(true);
        setMessage(e.message);
      });
  }, []);
  const dirty = !!data && JSON.stringify(data) !== initial;
  useUnsaved(dirty);
  return (
    <>
      <Heading
        title="Shape your story."
        subtitle="Edit the content visitors see across your portfolio."
      />
      <Notice message={message} error={error} />
      {data ? (
        <>
          <div className="admin-tabs">
            {[...Object.keys(settingsGroups), "Sections"].map((g) => (
              <button
                className={g === group ? "active" : ""}
                key={g}
                onClick={() => setGroup(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <form
            className="admin-panel editor-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setMessage("");
              try {
                const value = settingsSchema.parse(data);
                const r = await api("/api/admin/settings", "POST", value);
                setData(r.data);
                setInitial(JSON.stringify(r.data));
                setError(false);
                setMessage(
                  "Saved and published. Your portfolio is up to date.",
                );
              } catch (e) {
                setError(true);
                setMessage(e instanceof Error ? e.message : "Unable to save.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {group === "Sections" ? (
              <>
                <div className="editor-grid">
                  {data.navOrder.map((key, i) => (
                    <label key={i}>
                      Navigation position {i + 1}
                      <select
                        value={key}
                        onChange={(e) => {
                          const next = [...data.navOrder];
                          const index = next.indexOf(
                            e.target.value as typeof key,
                          );
                          [next[i], next[index]] = [next[index], next[i]];
                          setData({ ...data, navOrder: next });
                        }}
                      >
                        {["home", "about", "projects", "contact"].map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="editor-group-note">
                  Move sections up or down and choose which appear on Home.
                  Dedicated pages remain accessible from navigation.
                </p>
                <div className="section-order">
                  {data.sectionOrder.map((key, i) => (
                    <div key={key}>
                      <label>
                        <input
                          type="checkbox"
                          checked={!data.hiddenSections.includes(key)}
                          onChange={(e) =>
                            setData({
                              ...data,
                              hiddenSections: e.target.checked
                                ? data.hiddenSections.filter((v) => v !== key)
                                : [...data.hiddenSections, key],
                            })
                          }
                        />
                        {key[0].toUpperCase() + key.slice(1)}
                      </label>
                      <div>
                        {[-1, 1].map((direction) => (
                          <button
                            key={direction}
                            type="button"
                            aria-label={`Move ${key} ${direction === -1 ? "up" : "down"}`}
                            disabled={
                              i + direction < 0 ||
                              i + direction >= data.sectionOrder.length
                            }
                            onClick={() => {
                              const order = [...data.sectionOrder];
                              [order[i], order[i + direction]] = [
                                order[i + direction],
                                order[i],
                              ];
                              setData({ ...data, sectionOrder: order });
                            }}
                          >
                            {direction === -1 ? (
                              <ArrowUp size={13} />
                            ) : (
                              <ArrowDown size={13} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="editor-grid">
                {settingsGroups[group].map((f) => (
                  <Field
                    key={f.key}
                    field={f}
                    value={data[f.key as keyof Settings]}
                    onChange={(v) => setData({ ...data, [f.key]: v })}
                    assets={assets}
                  />
                ))}
              </div>
            )}
            <div className="form-actions">
              <span className="unsaved">
                {dirty ? "Unsaved changes" : "All changes saved"}
              </span>
              <button className="button primary" disabled={busy || !dirty}>
                {busy ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Save & publish
              </button>
            </div>
          </form>
        </>
      ) : (
        !message && <Loading />
      )}
    </>
  );
}
const commonFields: FieldDef[] = [
  { key: "title", label: "Title", required: true },
  {
    key: "slug",
    label: "URL slug",
    required: true,
    help: "Lowercase letters, numbers, hyphens.",
  },
  { key: "summary", label: "Description", type: "textarea", full: true },
  {
    key: "order",
    label: "Display order",
    type: "number",
    help: "Lower values appear first.",
  },
  { key: "visible", label: "Visible on public site", type: "checkbox" },
];
function fieldsFor(kind: Kind): FieldDef[] {
  if (kind === "projects")
    return [
      commonFields[0],
      commonFields[1],
      { key: "category", label: "Category" },
      { key: "tools", label: "Tools (comma separated)" },
      commonFields[2],
      { key: "cover", label: "Cover image", type: "media" },
      { key: "coverAlt", label: "Cover image alt text" },
      {
        key: "challenge",
        label: "The challenge",
        type: "textarea",
        full: true,
      },
      { key: "solution", label: "The approach", type: "textarea", full: true },
      { key: "outcome", label: "The outcome", type: "textarea", full: true },
      {
        key: "metrics",
        label: "Verified result rows",
        type: "textarea",
        full: true,
        help: "One result per line: label | value. Only use results you can substantiate.",
      },
      { key: "link", label: "External project URL", full: true },
      { key: "seoTitle", label: "SEO title" },
      { key: "seoDescription", label: "SEO description", type: "textarea" },
      commonFields[3],
      {
        key: "status",
        label: "Publication status",
        type: "select",
        options: ["draft", "published"],
      },
      { key: "featured", label: "Featured on Home", type: "checkbox" },
      commonFields[4],
      { key: "demo", label: "Label as illustrative example", type: "checkbox" },
    ];
  if (kind === "experience")
    return [
      commonFields[0],
      commonFields[1],
      { key: "organization", label: "Organization" },
      commonFields[2],
      { key: "start", label: "Start date", type: "date" },
      { key: "end", label: "End date", type: "date" },
      { key: "current", label: "Current role", type: "checkbox" },
      commonFields[3],
      commonFields[4],
    ];
  return [
    commonFields[0],
    commonFields[1],
    { key: "category", label: "Category" },
    ...(kind === "skills"
      ? [{ key: "proficiency", label: "Proficiency label (optional)" }]
      : [commonFields[2]]),
    {
      key: "icon",
      label: "Icon",
      type: "select",
      options: ["chart", "target", "layers", "code", "globe", "shield"],
    },
    commonFields[3],
    commonFields[4],
  ];
}
function ContentManager({ kind }: { kind: Kind }) {
  const [records, setRecords] = useState<Entry[]>([]),
    [editing, setEditing] = useState<Entry | null>(null),
    [assets, setAssets] = useState<Asset[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([
        api(`/api/admin/${kind}?page=${page}`),
        allAssets(),
      ]);
      setRecords(r.data);
      setTotal(r.total);
      setAssets(a);
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }, [kind, page]);
  useEffect(() => {
    void load();
  }, [load]);
  if (editing)
    return (
      <EntryEditor
        key={editing._id}
        entry={editing}
        assets={assets}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          setError(false);
          setMessage("Content saved.");
          await load();
        }}
      />
    );
  return (
    <>
      <Heading
        title={kind[0].toUpperCase() + kind.slice(1)}
        subtitle={
          kind === "projects"
            ? "Show the thinking and results behind your work."
            : "Keep your portfolio accurate and up to date."
        }
      >
        <button
          className="button primary"
          onClick={() =>
            setEditing({
              ...blankEntry,
              _id: "new",
              kind,
              status: kind === "projects" ? "draft" : "published",
            })
          }
        >
          <Plus size={16} />
          Add {kind === "experience" ? "experience" : kind.slice(0, -1)}
        </button>
      </Heading>
      <Notice message={message} error={error} />
      {loading ? (
        <Loading />
      ) : records.length ? (
        <div className="admin-list">
          {records.map((e) => (
            <div className="admin-item" key={e._id}>
              <div className="item-icon">
                {e.cover ? (
                  <img src={e.cover} alt="" />
                ) : (
                  <FolderKanban size={21} />
                )}
              </div>
              <div className="item-details">
                <h3>{e.title}</h3>
                <p>
                  {kind === "experience"
                    ? e.organization
                    : e.category || e.slug}{" "}
                  · Order {e.order}
                </p>
              </div>
              <span
                className={`badge ${!e.visible ? "hidden" : e.status === "draft" ? "draft" : ""}`}
              >
                {!e.visible
                  ? "Hidden"
                  : e.status === "draft"
                    ? "Draft"
                    : "Published"}
              </span>
              <div className="item-actions">
                {kind === "projects" && (
                  <Link
                    className="small-button"
                    href={`/projects/${e.slug}${e.status === "draft" || !e.visible ? "?preview=1" : ""}`}
                    target="_blank"
                    aria-label={`Preview ${e.title}`}
                  >
                    <Eye size={14} />
                  </Link>
                )}
                <button onClick={() => setEditing(e)}>
                  <Pencil size={13} />
                  Edit
                </button>
                <button
                  className="danger-button"
                  aria-label={`Delete ${e.title}`}
                  onClick={async () => {
                    if (!confirm(`Delete “${e.title}”? This cannot be undone.`))
                      return;
                    try {
                      await api(`/api/admin/${kind}/${e._id}`, "DELETE", {});
                      setError(false);
                      setMessage("Deleted.");
                      await load();
                    } catch (e) {
                      setError(true);
                      setMessage(
                        e instanceof Error ? e.message : "Unable to delete.",
                      );
                    }
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-empty">
          <Plus size={30} />
          <h2>A fresh start.</h2>
          <p>Add your first entry to make this section yours.</p>
        </div>
      )}
      <Pagination page={page} total={total} setPage={setPage} />
    </>
  );
}
function EntryEditor({
  entry,
  assets,
  onClose,
  onSaved,
}: {
  entry: Entry;
  assets: Asset[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState<Entry>(entry),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(entry);
  useUnsaved(dirty);
  return (
    <>
      <button
        className="back-button"
        onClick={() => {
          if (!dirty || confirm("Discard unsaved changes?")) onClose();
        }}
      >
        <ArrowLeft size={15} />
        Back to {entry.kind}
      </button>
      <Heading
        title={entry._id === "new" ? "Add a new entry." : "Refine the details."}
        subtitle={
          entry.kind === "projects"
            ? "Save as draft to preview privately, or publish when ready."
            : "Saving publishes this entry when visibility is enabled."
        }
      />
      <Notice message={message} error />
      <form
        className="admin-panel editor-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const values = entrySchema.parse({
              ...value,
              status: entry.kind === "projects" ? value.status : "published",
            });
            await api(
              `/api/admin/${entry.kind}${entry._id === "new" ? "" : `/${entry._id}`}`,
              entry._id === "new" ? "POST" : "PATCH",
              values,
            );
            await onSaved();
          } catch (e) {
            // Name the field in plain words, e.g. "External project URL: Use a full https:// URL".
            const labels = Object.fromEntries(
              fieldsFor(entry.kind).map((f) => [f.key, f.label]),
            );
            setMessage(
              e instanceof ZodError
                ? e.issues
                    .map(
                      (i) =>
                        `${labels[String(i.path[0])] ?? i.path.join(".")}: ${i.message}`,
                    )
                    .join(" · ")
                : e instanceof Error
                  ? e.message
                  : "Unable to save.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="editor-grid">
          {fieldsFor(entry.kind).map((f) => (
            <Field
              key={f.key}
              field={f}
              value={value[f.key as keyof Entry]}
              assets={assets}
              onChange={(v) => {
                setValue((prev) => ({
                  ...prev,
                  [f.key]: v,
                  ...(f.key === "title" &&
                  entry._id === "new" &&
                  (!prev.slug ||
                    prev.slug ===
                      prev.title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""))
                    ? {
                        slug: String(v)
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, ""),
                      }
                    : {}),
                }));
              }}
            />
          ))}
        </div>
        {entry.kind === "projects" && (
          <div className="gallery-fields">
            <h3>Project gallery</h3>
            {value.gallery.map((g, i) => (
              <div className="gallery-item" key={i}>
                <Field
                  field={{ key: "url", label: `Image ${i + 1}`, type: "media" }}
                  value={g.url}
                  assets={assets}
                  onChange={(v) =>
                    setValue({
                      ...value,
                      gallery: value.gallery.map((item, j) =>
                        j === i ? { ...item, url: String(v) } : item,
                      ),
                    })
                  }
                />
                <Field
                  field={{ key: "alt", label: "Image description" }}
                  value={g.alt}
                  assets={assets}
                  onChange={(v) =>
                    setValue({
                      ...value,
                      gallery: value.gallery.map((item, j) =>
                        j === i ? { ...item, alt: String(v) } : item,
                      ),
                    })
                  }
                />
                <button
                  className="small-button danger-button"
                  type="button"
                  onClick={() =>
                    setValue({
                      ...value,
                      gallery: value.gallery.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remove image
                </button>
              </div>
            ))}
            <button
              className="small-button"
              type="button"
              disabled={value.gallery.length >= 12}
              onClick={() =>
                setValue({
                  ...value,
                  gallery: [...value.gallery, { url: "", alt: "" }],
                })
              }
            >
              <Plus size={14} />
              Add gallery image
            </button>
          </div>
        )}
        <div className="form-actions">
          {message ? (
            <span role="alert" className="field-error">
              {message}
            </span>
          ) : (
            <span className="unsaved">{dirty ? "Unsaved changes" : ""}</span>
          )}
          <div>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                if (!dirty || confirm("Discard unsaved changes?")) onClose();
              }}
            >
              Cancel
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Save size={16} />
              )}
              Save{" "}
              {entry.kind === "projects" && value.status === "draft"
                ? "draft"
                : "& publish"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
function Pagination({
  page,
  total,
  setPage,
}: {
  page: number;
  total: number;
  setPage: (n: number) => void;
}) {
  if (total <= 50) return null;
  return (
    <div className="pagination">
      <button
        className="small-button"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} / {Math.ceil(total / 50)}
      </span>
      <button
        className="small-button"
        disabled={page * 50 >= total}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
function MediaLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  const file = useRef<HTMLInputElement>(null);
  const load = useCallback(
    () =>
      api(`/api/admin/media?page=${page}`)
        .then((r) => {
          setAssets(r.data);
          setTotal(r.total);
        })
        .catch((e) => {
          setError(true);
          setMessage(e.message);
        }),
    [page],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <Heading
        title="Your media library."
        subtitle="Upload once. Use across your portfolio."
      />
      <Notice message={message} error={error} />
      <form
        className="upload-zone"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          const selected = file.current?.files?.[0];
          const values = new FormData(e.currentTarget);
          try {
            if (!selected) throw new Error("Choose a file.");
            await uploadAsset(selected, String(values.get("alt") ?? ""));
            setError(false);
            setMessage("Uploaded and verified. Ready to use.");
            if (file.current) file.current.value = "";
            await load();
          } catch (e) {
            setError(true);
            setMessage(e instanceof Error ? e.message : "Upload failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>A new image. A better story.</h3>
        <p>
          JPG, PNG, WebP, AVIF or PDF · up to 10 MB · uploads go directly to
          Cloudinary
        </p>
        <div className="upload-controls">
          <label>
            Choose file
            <input
              ref={file}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
              required
              disabled={busy}
            />
          </label>
          <label>
            Describe this asset
            <input
              name="alt"
              required
              maxLength={200}
              placeholder="A clear, useful description"
              disabled={busy}
            />
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Upload size={16} />
            )}
            Upload
          </button>
        </div>
      </form>
      <div className="media-grid">
        {assets.map((a) => (
          <MediaCard
            key={a._id}
            asset={a}
            onRefresh={load}
            onNotice={(s, e) => {
              setMessage(s);
              setError(e);
            }}
          />
        ))}
      </div>
      {!assets.length && (
        <div className="admin-empty">
          <Images size={30} />
          <h2>Room for your visuals.</h2>
          <p>
            Upload a portrait, project screenshot, or résumé to get started.
          </p>
        </div>
      )}
      <Pagination page={page} total={total} setPage={setPage} />
    </>
  );
}
function MediaCard({
  asset: a,
  onRefresh,
  onNotice,
}: {
  asset: Asset;
  onRefresh: () => Promise<unknown>;
  onNotice: (s: string, e: boolean) => void;
}) {
  const [alt, setAlt] = useState(a.alt);
  return (
    <div className="media-card">
      <a
        className="media-preview"
        href={a.url}
        target="_blank"
        rel="noreferrer"
      >
        {a.format === "pdf" ? (
          <FileText size={45} />
        ) : (
          <img src={a.url} alt={a.alt} loading="lazy" />
        )}
      </a>
      <div className="media-info">
        <p>
          {a.format.toUpperCase()} · {(a.bytes / 1024).toFixed(0)} KB
        </p>
        <input
          aria-label="Asset description"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          maxLength={200}
        />
        <div className="media-actions">
          <button
            className="small-button"
            disabled={alt === a.alt || !alt.trim()}
            onClick={async () => {
              try {
                await api(`/api/admin/media/${a._id}`, "PATCH", { alt });
                await onRefresh();
                onNotice("Description updated.", false);
              } catch (e) {
                onNotice(
                  e instanceof Error ? e.message : "Unable to save.",
                  true,
                );
              }
            }}
          >
            <Check size={12} />
            Save
          </button>
          <button
            className="small-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(a.url);
                onNotice("URL copied.", false);
              } catch {
                onNotice(
                  "Open the asset to copy its URL from your browser.",
                  false,
                );
              }
            }}
          >
            Copy URL
          </button>
          <button
            className="small-button danger-button"
            aria-label={`Delete ${a.alt}`}
            onClick={async () => {
              if (
                !confirm(
                  "Delete this asset permanently? Assets used by content cannot be deleted.",
                )
              )
                return;
              try {
                await api(`/api/admin/media/${a._id}`, "DELETE", {});
                await onRefresh();
                onNotice("Asset deleted.", false);
              } catch (e) {
                onNotice(
                  e instanceof Error ? e.message : "Unable to delete.",
                  true,
                );
              }
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
function Inbox() {
  const [records, setRecords] = useState<Inquiry[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [filter, setFilter] = useState("Active");
  const load = useCallback(
    () =>
      api(`/api/admin/messages?page=${page}`)
        .then((r) => {
          setRecords(r.data);
          setTotal(r.total);
        })
        .catch((e) => {
          setError(true);
          setMessage(e.message);
        }),
    [page],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const action = async (id: string, data: unknown) => {
    try {
      await api(`/api/admin/messages/${id}`, "PATCH", data);
      await load();
      setError(false);
      setMessage("Inquiry updated.");
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : "Unable to update.");
    }
  };
  const shown = records.filter(
    (r) =>
      filter === "All" ||
      (filter === "Archived"
        ? r.archived
        : filter === "Unread"
          ? !r.read && !r.archived
          : !r.archived),
  );
  return (
    <>
      <Heading
        title="Good conversations start here."
        subtitle="Review inquiries and follow up through your email client."
      />
      <Notice message={message} error={error} />
      <div className="admin-tabs">
        {["Active", "Unread", "Archived", "All"].map((v) => (
          <button
            className={filter === v ? "active" : ""}
            key={v}
            onClick={() => setFilter(v)}
          >
            {v}
          </button>
        ))}
      </div>
      {total > 50 && (
        <p className="editor-group-note">
          Filters apply to the current page of 50 inquiries.
        </p>
      )}
      {shown.map((r) => (
        <div className={`message-card ${r.read ? "" : "unread"}`} key={r._id}>
          <div className="message-head">
            <div>
              <h3>{r.name}</h3>
              <a href={`mailto:${r.email}`}>{r.email}</a>
            </div>
            <div className="message-meta">
              <span>{new Date(r.createdAt).toLocaleString()}</span>
              <span
                className={`badge ${r.notification === "sent" ? "" : "draft"}`}
              >
                Email: {r.notification}
              </span>
            </div>
          </div>
          <div className="message-meta" style={{ marginTop: 15 }}>
            <span>{r.service}</span>
            {!r.read && <span className="badge">Unread</span>}
            {r.archived && <span className="badge hidden">Archived</span>}
          </div>
          <p>{r.message}</p>
          <div className="item-actions">
            <a
              className="small-button"
              href={`mailto:${r.email}?subject=${encodeURIComponent("Re: Your portfolio inquiry")}`}
            >
              Reply by email <ArrowUpRight size={12} />
            </a>
            <button onClick={() => action(r._id, { read: !r.read })}>
              {r.read ? "Mark unread" : "Mark read"}
            </button>
            <button onClick={() => action(r._id, { archived: !r.archived })}>
              {r.archived ? "Restore" : "Archive"}
            </button>
            {r.notification === "failed" && (
              <button onClick={() => action(r._id, { retry: true })}>
                <RefreshCw size={12} />
                Retry notification
              </button>
            )}
            <button
              className="danger-button"
              aria-label="Delete inquiry"
              onClick={async () => {
                if (!confirm("Permanently delete this inquiry?")) return;
                try {
                  await api(`/api/admin/messages/${r._id}`, "DELETE", {});
                  await load();
                } catch (e) {
                  setError(true);
                  setMessage(
                    e instanceof Error ? e.message : "Unable to delete.",
                  );
                }
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
      {!shown.length && (
        <div className="admin-empty">
          <Mail size={30} />
          <h2>A quiet inbox.</h2>
          <p>Inquiries matching this view will appear here.</p>
        </div>
      )}
      <Pagination page={page} total={total} setPage={setPage} />
    </>
  );
}
function Activity() {
  const [rows, setRows] = useState<AuditEntry[]>([]),
    [error, setError] = useState(""),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  useEffect(() => {
    api(`/api/admin/audit?page=${page}`)
      .then((r) => {
        setRows(r.data);
        setTotal(r.total);
      })
      .catch((e) => setError(e.message));
  }, [page]);
  return (
    <>
      <Heading
        title="A record of your updates."
        subtitle="Content changes and account security events. No passwords or message bodies are stored here."
      />
      <Notice message={error} error />
      <div className="admin-panel">
        {rows.map((r) => (
          <div className="audit-row" key={r._id}>
            <span>{new Date(r.createdAt).toLocaleString()}</span>
            <strong>
              {r.action} / {r.entity}
            </strong>
            <span>{r.fields.join(", ") || "Security event"}</span>
          </div>
        ))}
        {!rows.length && <p>No activity recorded yet.</p>}
      </div>
      <Pagination page={page} total={total} setPage={setPage} />
    </>
  );
}
function Account({ user }: { user: AdminUser }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <Heading
        title="Keep your studio secure."
        subtitle="Update your password and review your login identity."
      />
      <div className="admin-panel account-card">
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <p>
          Your login identity is separate from the public contact details in
          Site content.
        </p>
      </div>
      <form
        className="admin-panel editor-form account-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = new FormData(e.currentTarget);
          if (form.get("password") !== form.get("confirm")) {
            setBusy(false);
            setError("New passwords must match.");
            return;
          }
          try {
            await api("/api/auth/change-password", "POST", {
              currentPassword: form.get("currentPassword"),
              password: form.get("password"),
            });
            window.location.assign("/admin/login?changed=1");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Unable to update password.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Change password</h2>
        <Notice message={error} error />
        <label>
          Current password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
          />
          <small className="muted">
            At least 12 characters. All sessions will be signed out.
          </small>
        </label>
        <label>
          Confirm new password
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Save size={16} />
          )}
          Update password & sign out
        </button>
      </form>
    </>
  );
}

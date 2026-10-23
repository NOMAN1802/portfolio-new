import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { portfolio, getProject } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { appUrl } from "@/lib/env";
import { CaseTopbar, Footer, ProjectPlate } from "@/components/site";
import { fontVars } from "@/components/fonts";
import { ArrowUpRight, ArrowLeft, ArrowRight } from "lucide-react";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};
async function project(props: Props) {
  const { slug } = await props.params;
  const preview = (await props.searchParams).preview === "1";
  if (preview) {
    try {
      await requireAdmin();
    } catch (error) {
      if (error instanceof HttpError && error.status === 401)
        redirect("/admin/login");
      if (error instanceof HttpError && error.status === 403)
        redirect("/admin");
      throw error;
    }
  }
  return { record: await getProject(slug, preview), preview };
}
export async function generateMetadata(props: Props) {
  const { record: p, preview } = await project(props);
  if (!p) return { title: "Project not found" };
  return {
    title: p.seoTitle || p.title,
    description: p.seoDescription || p.summary,
    robots: preview ? { index: false, follow: false } : undefined,
    alternates: { canonical: `${appUrl()}/projects/${p.slug}` },
    openGraph: {
      title: p.title,
      description: p.summary,
      ...(p.cover ? { images: [p.cover] } : {}),
    },
  };
}
const pad = (n: number) => String(n).padStart(2, "0");
export default async function Project(props: Props) {
  const { record: p, preview } = await project(props);
  if (!p) notFound();
  const { settings: s, entries } = await portfolio();
  const all = entries.filter((e) => e.kind === "projects");
  const at = all.findIndex((e) => e.slug === p.slug);
  const next = all.length > 1 ? all[(Math.max(at, 0) + 1) % all.length] : null;
  const tools = p.tools
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const facts = [
    ["CATEGORY", p.category || "Case study"],
    ["TOOLS", tools.join(" / ")],
    ["ROLE", s.role],
    ["CLIENT", p.organization],
  ].filter(([, v]) => v);
  const blocks = [
    ["THE CHALLENGE", p.challenge],
    ["THE APPROACH", p.solution],
    ["THE OUTCOME", p.outcome],
  ].filter(([, body]) => body);
  return (
    <div className={`px cs-page ${fontVars} accent-${s.accent}`}>
      <CaseTopbar settings={s} />
      <main className="cs" id="main">
        {preview && <p className="cs-draft">AUTHENTICATED DRAFT PREVIEW</p>}
        <nav className="cs-crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <i>/</i>
          <Link href="/#projects">{s.navProjects}</Link>
          <i>/</i>
          <b>{at >= 0 ? pad(at + 1) : "00"}</b>
        </nav>

        <header className="cs-head">
          <p className="px-meta">
            <b>{at >= 0 ? pad(at + 1) : "00"}</b>
            {p.category || "CASE STUDY"}
            {p.demo && <em>ILLUSTRATIVE EXAMPLE</em>}
          </p>
          <h1 className="px-display">{p.title}</h1>
          <p className="cs-summary">{p.summary}</p>
        </header>

        <dl className="cs-facts">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          {p.link && (
            <div>
              <dt>LIVE</dt>
              <dd>
                <a href={p.link} target="_blank" rel="noreferrer">
                  Visit project <ArrowUpRight size={14} />
                </a>
              </dd>
            </div>
          )}
        </dl>

        <figure className="cs-cover">
          {p.cover ? (
            <img src={p.cover} alt={p.coverAlt || p.title} />
          ) : (
            <ProjectPlate index={Math.max(at, 0)} label={p.category || "CASE STUDY"} />
          )}
          <i className="c1" />
          <i className="c2" />
        </figure>

        {blocks.map(([title, body], i) => (
          <section className="cs-block" key={title}>
            <p className="px-label">
              <b>{pad(i + 1)}</b>
              {title}
            </p>
            <div>
              {body.split("\n").map((line, j) => (
                <p key={j}>{line}</p>
              ))}
            </div>
          </section>
        ))}

        {p.metrics && (
          <section className="cs-results">
            <p className="px-label">
              <b>{pad(blocks.length + 1)}</b>
              RESULTS
              <span />
            </p>
            <div className="cs-metrics">
              {p.metrics
                .split("\n")
                .filter(Boolean)
                .map((line, i) => {
                  const [label, ...value] = line.split("|");
                  return (
                    <div key={i}>
                      <span>{label.trim()}</span>
                      <strong>{value.join("|").trim() || "—"}</strong>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {p.gallery.some((g) => g.url) && (
          <section className="cs-gallery">
            <p className="px-label">
              <b>{pad(blocks.length + (p.metrics ? 2 : 1))}</b>
              GALLERY
              <span />
            </p>
            <div>
              {p.gallery
                .filter((g) => g.url)
                .map((g, i) => (
                  <figure key={`${g.url}-${i}`}>
                    <img src={g.url} alt={g.alt} loading="lazy" />
                    <figcaption>
                      <b>{pad(i + 1)}</b>
                      {g.alt}
                    </figcaption>
                  </figure>
                ))}
            </div>
          </section>
        )}

        {next && (
          <Link href={`/projects/${next.slug}`} className="cs-next">
            <span>NEXT PROJECT</span>
            <strong className="px-display">{next.title}</strong>
            <em>
              {next.category || "CASE STUDY"} <ArrowRight size={18} />
            </em>
          </Link>
        )}

        <div className="cs-cta">
          <h2 className="px-display">
            Let’s solve your
            <br />
            measurement challenge.
          </h2>
          <div className="px-actions">
            <Link className="px-btn solid" href="/#contact">
              Start a conversation <ArrowUpRight size={18} />
            </Link>
            <Link className="px-btn" href="/#projects">
              <ArrowLeft size={17} /> All projects
            </Link>
          </div>
        </div>
      </main>
      <Footer settings={s} />
    </div>
  );
}

"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ArrowDown, ArrowUpRight, LoaderCircle, X } from "lucide-react";
import type { Settings, Entry } from "@/lib/content";
import { fontVars } from "./fonts";
import "./site.css";

const Scene = dynamic(() => import("./scene"), { ssr: false });
const MotionOn = createContext(true);
const ease = [0.16, 1, 0.3, 1] as const;

type SectionKey = Settings["sectionOrder"][number];
type NavKey = Settings["navOrder"][number];

function Wordmark({
  settings: s,
  href,
}: {
  settings: Settings;
  href: string;
}) {
  return (
    <Link className="px-brand" href={href} aria-label={`${s.name} — top`}>
      {s.logo && <img src={s.logo} alt="" />}
      {s.brandWord || "emon"}
      <i />
    </Link>
  );
}

function Rise({
  children,
  delay = 0,
  now = false,
}: {
  children: React.ReactNode;
  delay?: number;
  now?: boolean;
}) {
  const on = useContext(MotionOn);
  // observe the clipping wrapper: the text itself starts outside it
  const wrap = useRef<HTMLSpanElement>(null);
  const seen = useInView(wrap, { once: true, margin: "0px 0px -8% 0px" });
  return (
    <span className="px-rise" ref={wrap}>
      <motion.span
        className="px-rise-in"
        initial={on ? { y: "108%" } : false}
        // same unit on both ends ("%"), so motion needn't measure the DOM,
        // which would scroll the page to the top mid-jump
        animate={{ y: now || seen ? "0%" : "108%" }}
        transition={{ duration: 0.95, delay, ease }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Lines({
  text,
  now = false,
  start = 0,
  outlineFirst = false,
}: {
  text: string;
  now?: boolean;
  start?: number;
  outlineFirst?: boolean;
}) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span
          className={outlineFirst && i === 0 ? "px-outline" : undefined}
          key={i}
        >
          <Rise now={now} delay={start + i * 0.09}>
            {line}
          </Rise>
        </span>
      ))}
    </>
  );
}

function Fade({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const on = useContext(MotionOn);
  return (
    <motion.div
      className={className}
      initial={on ? { opacity: 0, y: 24 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-6%" }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

function Count({ to }: { to: number }) {
  const on = useContext(MotionOn);
  const [value, setValue] = useState(on ? 0 : to);
  useEffect(() => {
    if (!on) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.6,
      delay: 0.7,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, on]);
  return <>{value}</>;
}

function LocalTime({ location }: { location: string }) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const zone = /bangladesh|dhaka/i.test(location) ? "Asia/Dhaka" : undefined;
    const tick = () =>
      setTime(
        new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: zone,
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [location]);
  return (
    <>
      {location.split(",")[0]} {time}
    </>
  );
}

export function ProjectPlate({
  index,
  label,
}: {
  index: number;
  label: string;
}) {
  return (
    <div className="px-plate" aria-hidden="true">
      <span>{String(index + 1).padStart(2, "0")}</span>
      <small>{label}</small>
    </div>
  );
}

/* ---------- sections ---------- */

function Hero({
  settings: s,
  entries,
}: {
  settings: Settings;
  entries: Entry[];
}) {
  const projects = entries.filter((e) => e.kind === "projects");
  const skills = entries.filter((e) => e.kind === "skills");
  const services = entries.filter((e) => e.kind === "services");
  const firstYear = Math.min(
    ...entries
      .filter((e) => e.kind === "experience" && e.start)
      .map((e) => Number(e.start.slice(0, 4))),
  );
  const years = Number.isFinite(firstYear)
    ? new Date().getFullYear() - firstYear
    : 0;
  const stats = [
    { n: projects.length, label: "PROJECTS" },
    years > 0
      ? { n: years, label: "YEARS" }
      : skills.length
        ? { n: skills.length, label: "TOOLS" }
        : { n: services.length, label: "SERVICES" },
  ].filter((x) => x.n > 0);
  const rows = [
    ["ROLE", s.role],
    ["STACK", skills.slice(0, 3).map((x) => x.title).join(" / ")],
    ["BASED IN", s.location],
    ["STATUS", s.availability],
  ].filter(([, v]) => v);
  const tags = s.expertiseStrip
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const ticker = [...tags, ...tags];
  return (
    <section className="px-hero" id="home">
      <div className="px-hero-copy">
        <p className="px-live">
          <i />
          {s.availability}
        </p>
        <h1 className="px-display px-hero-title">
          <Lines text={s.headline} now start={0.15} outlineFirst />
        </h1>
        <p className="px-tags">[ {tags.slice(0, 2).join(" · ")} ]</p>
        <p className="px-lede">{s.intro}</p>
        <div className="px-actions">
          <a className="px-btn solid" href="#contact">
            {s.primaryCta}
            <ArrowUpRight size={18} />
          </a>
          <a className="px-btn" href="#projects">
            {s.secondaryCta}
            <ArrowDown size={17} />
          </a>
        </div>
      </div>
      <aside className="px-stats" aria-label={`${s.name} at a glance`}>
        <div className="px-stats-head">
          <span>{s.heroAnnotation || "AT A GLANCE"}</span>
          <span className="px-live small">
            <i />
            ACTIVE
          </span>
        </div>
        <div className="px-stats-nums">
          {stats.map((x, i) => (
            <div key={x.label}>
              <strong className="px-display">
                <Count to={x.n} />
                {x.n >= 10 ? "+" : ""}
              </strong>
              <small>{x.label}</small>
              <em>{String(i + 1).padStart(2, "0")}</em>
            </div>
          ))}
        </div>
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {(s.heroFlow || s.heroFooter) && (
          <p className="px-stats-foot">
            {s.heroFlow && <b>{s.heroFlow}</b>}
            {s.heroFooter}
          </p>
        )}
      </aside>
      {s.heroCoord && <span className="px-coord">{s.heroCoord}</span>}
      <div className="px-ticker" aria-hidden="true">
        <div>
          {ticker.map((t, i) => (
            <span key={i}>{i % 2 ? <b>{t}</b> : <em>{t}</em>}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Portrait({ settings: s }: { settings: Settings }) {
  const reference = s.portrait === "/emon-reference.jpeg";
  return (
    <div className={`px-portrait ${reference ? "is-ref" : ""}`}>
      {s.portrait ? (
        <img src={s.portrait} alt={s.portraitAlt} loading="lazy" />
      ) : (
        <span>{s.name.slice(0, 2).toUpperCase()}</span>
      )}
      <i className="c1" />
      <i className="c2" />
    </div>
  );
}

function Label({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="px-label">
      <b>{n}</b>
      {children}
      <span />
    </p>
  );
}

function About({ settings: s }: { settings: Settings }) {
  return (
    <section className="px-sec px-about" id="about">
      <div className="px-about-copy">
        <Label n="01">INTRODUCTION</Label>
        <p className="px-kicker">{s.role}</p>
        <h2 className="px-display px-h2">
          <Lines text={s.aboutTitle} />
        </h2>
        <Fade className="px-body" delay={0.1}>
          {s.biography.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </Fade>
        <Fade className="px-actions" delay={0.2}>
          <a className="px-btn solid" href="#contact">
            Let’s work together <ArrowUpRight size={18} />
          </a>
          {s.resume && (
            <a
              className="px-btn"
              href={s.resume}
              target="_blank"
              rel="noreferrer"
            >
              Résumé <ArrowUpRight size={18} />
            </a>
          )}
        </Fade>
      </div>
      <Fade className="px-about-side" delay={0.15}>
        <Portrait settings={s} />
        <p className="px-caption">
          {s.name} — {s.location}
        </p>
      </Fade>
    </section>
  );
}

function Services({
  entries,
  settings: s,
  choose,
}: {
  entries: Entry[];
  settings: Settings;
  choose: (service: string) => void;
}) {
  const items = entries.filter((e) => e.kind === "services");
  if (!items.length) return null;
  return (
    <section className="px-sec" id="services">
      <Label n="02">WHAT I DO</Label>
      <h2 className="px-display px-h2 small">
        <Lines text={s.servicesTitle} />
      </h2>
      <ol className="px-rows">
        {items.map((e, i) => (
          <li key={e._id}>
            <Fade className="px-row">
              <span className="px-idx">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="px-display">{e.title}</h3>
              <p>{e.summary}</p>
              <a
                href="#contact"
                aria-label={`Discuss ${e.title}`}
                onClick={() => choose(e.title)}
                className="px-round"
              >
                <ArrowUpRight size={20} />
              </a>
            </Fade>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Skills({
  entries,
  settings: s,
}: {
  entries: Entry[];
  settings: Settings;
}) {
  const skills = entries.filter((e) => e.kind === "skills");
  if (!skills.length) return null;
  return (
    <section className="px-sec" id="skills">
      <Label n="03">TOOLKIT</Label>
      <h2 className="px-display px-h2 small">
        <Lines text={s.skillsTitle} />
      </h2>
      <Fade className="px-chips">
        {skills.map((e, i) => (
          <span className="px-chip static" key={e._id}>
            <i>0x{i.toString(16).padStart(2, "0")}</i>
            {e.title}
            {e.proficiency && <small>{e.proficiency}</small>}
          </span>
        ))}
      </Fade>
    </section>
  );
}

function Experience({
  entries,
  settings: s,
}: {
  entries: Entry[];
  settings: Settings;
}) {
  const items = entries.filter((e) => e.kind === "experience");
  if (!items.length) return null;
  return (
    <section className="px-sec" id="experience">
      <Label n="04">EXPERIENCE</Label>
      <h2 className="px-display px-h2 small">
        <Lines text={s.experienceTitle} />
      </h2>
      <ol className="px-rows">
        {items.map((e) => (
          <li key={e._id}>
            <Fade className="px-row exp">
              <span className="px-idx">
                {e.start?.slice(0, 4)} — {e.current ? "NOW" : e.end?.slice(0, 4)}
              </span>
              <div>
                <h3 className="px-display">{e.title}</h3>
                <span className="px-org">{e.organization}</span>
              </div>
              <p>{e.summary}</p>
            </Fade>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Projects({
  entries,
  settings: s,
}: {
  entries: Entry[];
  settings: Settings;
}) {
  const [filter, setFilter] = useState("All");
  const projects = entries.filter((e) => e.kind === "projects");
  const categories = [
    "All",
    ...new Set(projects.map((p) => p.category).filter(Boolean)),
  ];
  const shown = projects.filter(
    (p) => filter === "All" || p.category === filter,
  );
  return (
    <section className="px-sec" id="projects">
      <Label n="05">SELECTED WORK</Label>
      <h2 className="px-display px-h2 small">
        <Lines text={s.projectsTitle} />
      </h2>
      {categories.length > 2 && (
        <div className="px-chips" role="group" aria-label="Filter projects">
          {categories.map((c) => (
            <button
              type="button"
              key={c}
              className={`px-chip ${filter === c ? "on" : ""}`}
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {shown.length ? (
        <ol className="px-work">
          {shown.map((p, i) => (
            <li key={p._id}>
              <Fade>
                <Link href={`/projects/${p.slug}`} className="px-project">
                  <div className="px-thumb">
                    {p.cover ? (
                      <img
                        src={p.cover}
                        alt={p.coverAlt || p.title}
                        loading="lazy"
                      />
                    ) : (
                      <ProjectPlate
                        index={i}
                        label={p.category || "CASE STUDY"}
                      />
                    )}
                  </div>
                  <div className="px-project-copy">
                    <p className="px-meta">
                      <b>{String(i + 1).padStart(2, "0")}</b>
                      {p.category || "CASE STUDY"}
                      {p.demo && <em>ILLUSTRATIVE EXAMPLE</em>}
                    </p>
                    <h3 className="px-display">{p.title}</h3>
                    <p className="px-summary">{p.summary}</p>
                    <div className="px-pills">
                      {p.tools
                        .split(",")
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((t) => (
                          <span key={t}>{t.trim()}</span>
                        ))}
                    </div>
                  </div>
                  <span className="px-view">
                    VIEW CASE <ArrowUpRight size={16} />
                  </span>
                </Link>
              </Fade>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-empty">
          Case studies are being prepared. Get in touch to discuss your project.
        </p>
      )}
    </section>
  );
}

type ContactLink = { label: string; href: string; external: boolean };

function Contact({
  settings: s,
  entries,
  demo,
  service,
  setService,
}: {
  settings: Settings;
  entries: Entry[];
  demo: boolean;
  service: string;
  setService: (v: string) => void;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const options = [
    ...entries.filter((e) => e.kind === "services").map((e) => e.title),
    "Other inquiry",
  ];
  const links: ContactLink[] = [
    s.email && { label: s.email, href: `mailto:${s.email}`, external: false },
    s.phone && {
      label: s.phone,
      href: `tel:${s.phone.replace(/[^+\d]/g, "")}`,
      external: false,
    },
    s.whatsapp && {
      label: "WhatsApp",
      href: `https://wa.me/${s.whatsapp.replace(/\D/g, "")}`,
      external: true,
    },
    s.linkedin && { label: "LinkedIn", href: s.linkedin, external: true },
    s.github && { label: "GitHub", href: s.github, external: true },
    s.facebook && { label: "Facebook", href: s.facebook, external: true },
  ].filter(Boolean) as ContactLink[];
  return (
    <section className="px-sec px-contact" id="contact">
      <div className="px-contact-copy">
        <Label n="06">LET’S CONNECT</Label>
        <p className="px-kicker">[ TRANSMISSION_FORM ]</p>
        <h2 className="px-display px-h2">
          <Lines text={s.contactTitle} />
        </h2>
        <Fade className="px-body" delay={0.1}>
          <p>{s.contactIntro}</p>
        </Fade>
        {links.length > 0 && (
          <ul className="px-links">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  {...(l.external
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  {l.label}
                  <ArrowUpRight size={16} />
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="px-live">
          <i />
          {s.availability}
        </p>
      </div>
      <Fade delay={0.1}>
        <form
          className="px-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || sent) return;
            setBusy(true);
            setStatus("");
            const form = e.currentTarget;
            const values = Object.fromEntries(new FormData(form));
            try {
              const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              setSent(true);
              setStatus(data.message);
              form.reset();
            } catch (error) {
              setStatus(
                error instanceof Error
                  ? error.message
                  : "Unable to send. Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="px-two">
            <label className="px-field">
              <span>
                <b>01</b> YOUR NAME
              </span>
              <input
                name="name"
                autoComplete="name"
                placeholder="Jane Doe"
                minLength={2}
                maxLength={100}
                required
                disabled={sent}
              />
            </label>
            <label className="px-field">
              <span>
                <b>02</b> EMAIL ADDRESS
              </span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="jane@company.com"
                maxLength={254}
                required
                disabled={sent}
              />
            </label>
          </div>
          <fieldset className="px-field" disabled={sent}>
            <legend>
              <b>03</b> WHAT CAN I HELP WITH
            </legend>
            <div className="px-chips">
              {options.map((o, i) => (
                <label className="px-chip" key={o}>
                  <input
                    type="radio"
                    name="service"
                    value={o}
                    required
                    checked={service === o}
                    onChange={() => setService(o)}
                  />
                  <span>
                    <i>0x{i.toString(16).padStart(2, "0")}</i>
                    {o}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="px-field">
            <span>
              <b>04</b> MESSAGE
            </span>
            <textarea
              name="message"
              rows={4}
              minLength={20}
              maxLength={5000}
              placeholder="Your goals, your challenges, and what’s next…"
              required
              disabled={sent}
            />
          </label>
          <div className="px-honey" aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          {demo && (
            <p className="px-note">
              Preview mode — connect MongoDB and email to receive inquiries.
            </p>
          )}
          <button
            className="px-btn solid px-submit"
            disabled={busy || sent || demo}
          >
            {busy ? (
              <LoaderCircle className="px-spin" size={18} />
            ) : sent ? (
              "Message received"
            ) : (
              "Send message"
            )}
            <ArrowUpRight size={18} />
          </button>
          <p role="status" className={sent ? "px-ok" : "px-err"}>
            {status}
          </p>
          <small className="px-note">
            Your details are used only to respond to your inquiry.
          </small>
        </form>
      </Fade>
    </section>
  );
}

export function Footer({ settings: s }: { settings: Settings }) {
  return (
    <footer className="px-footer">
      <span>{s.footer}</span>
      <div>
        <Link href="/admin">Admin</Link>
        <span>
          © {new Date().getFullYear()} {s.name}
        </span>
      </div>
    </footer>
  );
}

/* ---------- chrome: brand, index rail, section title, nav dock ---------- */

function Dots({ open }: { open: boolean }) {
  return open ? (
    <X size={20} />
  ) : (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      {[
        [5, 5],
        [15, 5],
        [5, 15],
        [15, 15],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="2.3" fill="currentColor" />
      ))}
    </svg>
  );
}

export default function Portfolio({
  settings: s,
  entries,
  demo,
}: {
  settings: Settings;
  entries: Entry[];
  demo: boolean;
}) {
  const reduced = useReducedMotion();
  const motionOn = s.motion && !reduced;
  const root = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const [service, setService] = useState("");

  const has = (k: SectionKey) =>
    !s.hiddenSections.includes(k) &&
    (k === "about" ||
      k === "projects" ||
      k === "contact" ||
      entries.some((e) => e.kind === k));
  const order = s.sectionOrder.filter(has);
  const labels: Record<SectionKey, string> = {
    about: s.navAbout,
    services: "Services",
    skills: "Toolkit",
    experience: "Experience",
    projects: s.navProjects,
    contact: s.navContact,
  };
  const sections = [
    { id: "home", label: s.navHome },
    ...order.map((k) => ({ id: k as string, label: labels[k] })),
  ];
  const ids = sections.map((x) => x.id).join(",");
  const navLabels: Record<NavKey, string> = {
    home: s.navHome,
    about: s.navAbout,
    projects: s.navProjects,
    contact: s.navContact,
  };
  const navLinks = s.navOrder
    .map((k) => ({ id: k as string, label: navLabels[k] }))
    .filter((x) => sections.some((sec) => sec.id === x.id));

  /* In-page links scroll to their section in code. The URL is deliberately
     left alone: a hash change (native, or via history.replaceState) makes the
     Next router reset the scroll position to the top, which on mobile cancels
     the jump. Deep links such as /#projects still work on first load. */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>(
        "a[href^='#']",
      );
      if (!a || !el.contains(a)) return;
      const target = document.getElementById(a.getAttribute("href")!.slice(1));
      if (!target) return;
      e.preventDefault();
      setOpen(false);
      target.scrollIntoView({
        behavior: motionOn ? "smooth" : "auto",
        block: "start",
      });
    };
    el.addEventListener("click", click);
    return () => el.removeEventListener("click", click);
  }, [motionOn]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.45;
      let current = "home";
      for (const id of ids.split(",")) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      root.current?.style.setProperty(
        "--progress",
        String(max > 0 ? Math.min(1, window.scrollY / max) : 0),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const away = (e: PointerEvent) => {
      if (!dock.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", away);
    };
  }, [open]);

  const index = Math.max(
    0,
    sections.findIndex((x) => x.id === active),
  );
  const current = sections[index];
  const parts: Record<SectionKey, React.ReactNode> = {
    about: <About key="about" settings={s} />,
    services: (
      <Services
        key="services"
        settings={s}
        entries={entries}
        choose={setService}
      />
    ),
    skills: <Skills key="skills" settings={s} entries={entries} />,
    experience: <Experience key="experience" settings={s} entries={entries} />,
    projects: <Projects key="projects" settings={s} entries={entries} />,
    contact: (
      <Contact
        key="contact"
        settings={s}
        entries={entries}
        demo={demo}
        service={service}
        setService={setService}
      />
    ),
  };
  const social = [
    s.email && { label: "Email", href: `mailto:${s.email}` },
    s.linkedin && { label: "LinkedIn", href: s.linkedin },
    s.github && { label: "GitHub", href: s.github },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <MotionOn.Provider value={motionOn}>
      <div
        ref={root}
        className={`px ${fontVars} accent-${s.accent} ${motionOn ? "" : "calm"} ${active === "home" ? "at-home" : ""}`}
      >
        <a className="px-skip" href="#main">
          Skip to content
        </a>
        <Scene
          enabled={motionOn}
          intensity={s.particleIntensity}
          portrait={s.portrait}
        />
        <div className="px-fade top" aria-hidden="true" />
        <div className="px-fade bottom" aria-hidden="true" />
        <div className="px-progress" aria-hidden="true" />

        <header className="px-top">
          <Wordmark settings={s} href="/" />
          {s.brandTagline && <span className="px-tagline">{s.brandTagline}</span>}
          {demo && <span className="px-preview">PREVIEW · STARTER CONTENT</span>}
        </header>

        <nav className="px-rail" aria-label="Sections">
          <span className="px-rail-title">INDEX</span>
          <ol>
            {sections.map((sec, i) => (
              <li key={sec.id} className={sec.id === active ? "on" : ""}>
                <a
                  href={`#${sec.id}`}
                  aria-label={sec.label}
                  aria-current={sec.id === active}
                >
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  <span>{sec.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="px-heading" aria-hidden="true">
          <AnimatePresence mode="wait">
            {active !== "home" && (
              <motion.div
                key={current.id}
                initial={motionOn ? { opacity: 0, y: 24 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={motionOn ? { opacity: 0, y: -24 } : { opacity: 0 }}
                transition={{ duration: 0.4, ease }}
              >
                <p>
                  {sections[0].label} <i>/</i> <b>{current.label}</b>
                </p>
                <span className="px-display">{current.label}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-hello">
          {s.email && (
            <p>
              <small>Wanna say hello?</small>
              <a href={`mailto:${s.email}`}>{s.email}</a>
            </p>
          )}
          <p>
            <small>Local time</small>
            <span>
              <LocalTime location={s.location} />
            </span>
          </p>
        </div>

        <div className="px-dock" ref={dock}>
          <span className="px-wave" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((b) => (
              <i key={b} style={{ animationDelay: `${b * 0.14}s` }} />
            ))}
          </span>
          <div className={`px-nav ${open ? "open" : ""}`}>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  className="px-menu"
                  id="px-menu"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: motionOn ? 0.35 : 0, ease }}
                >
                  <div className="px-menu-in">
                    <p className="px-menu-title">
                      Menu <small>NAVIGATION</small>
                    </p>
                    <ul>
                      {navLinks.map((n, i) => (
                        <motion.li
                          key={n.id}
                          initial={motionOn ? { opacity: 0, y: 12 } : false}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: 0.12 + i * 0.05,
                            duration: 0.4,
                            ease,
                          }}
                        >
                          <a
                            href={`#${n.id}`}
                            className={n.id === active ? "on" : ""}
                            autoFocus={i === 0}
                          >
                            <small>
                              [{sections.findIndex((x) => x.id === n.id) + 1}]
                            </small>
                            {n.label}
                            <i />
                          </a>
                        </motion.li>
                      ))}
                    </ul>
                    {s.headerCta && (
                      <a className="px-menu-cta" href="#contact">
                        {s.headerCta}
                        <ArrowUpRight size={16} />
                      </a>
                    )}
                    {social.length > 0 && (
                      <p className="px-menu-social">
                        {social.map((x) => (
                          <a
                            key={x.href}
                            href={x.href}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {x.label} ↗
                          </a>
                        ))}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              className="px-pill"
              aria-expanded={open}
              aria-controls="px-menu"
              aria-label={open ? "Close navigation" : "Open navigation"}
              onClick={() => setOpen((v) => !v)}
            >
              <small>[{index + 1}]</small>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={current.id}
                  initial={motionOn ? { opacity: 0, x: -8 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {current.label}
                </motion.span>
              </AnimatePresence>
              <em>
                <Dots open={open} />
              </em>
            </button>
          </div>
        </div>

        <main id="main" className="px-main">
          <Hero settings={s} entries={entries} />
          {order.map((k) => parts[k])}
          <Footer settings={s} />
        </main>
      </div>
    </MotionOn.Provider>
  );
}

/* Slim header for pages that live outside the landing page (case studies). */
export function CaseTopbar({ settings: s }: { settings: Settings }) {
  return (
    <header className="px-case-top">
      <Wordmark settings={s} href="/" />
      <nav aria-label="Main navigation">
        <Link href="/#about">{s.navAbout}</Link>
        <Link href="/#projects">{s.navProjects}</Link>
        <Link href="/#contact">{s.navContact}</Link>
      </nav>
    </header>
  );
}


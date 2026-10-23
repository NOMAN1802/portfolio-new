import { z } from "zod";

const text = (max = 500) => z.string().trim().max(max);
export const safeUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      (/^https?:\/\//i.test(v) &&
        (() => {
          try {
            return !!new URL(v).hostname;
          } catch {
            return false;
          }
        })()),
    "Use a full http:// or https:// URL",
  );
const mediaUrl = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      v === "/emon-reference.jpeg" ||
      /^https:\/\/res\.cloudinary\.com\//.test(v),
    "Choose a Cloudinary image",
  );
export const sectionKeys = [
  "about",
  "services",
  "skills",
  "experience",
  "projects",
  "contact",
] as const;
export const settingsSchema = z.object({
  brandWord: text(40).min(1),
  brandTagline: text(80),
  logo: mediaUrl,
  headerCta: text(60),
  aboutPageTitle: text(200),
  projectsPageTitle: text(200),
  heroAnnotation: text(100),
  heroFlow: text(100),
  heroFooter: text(150),
  heroCoord: text(100),
  expertiseStrip: text(500),
  navOrder: z
    .array(z.enum(["home", "about", "projects", "contact"]))
    .length(4)
    .refine((v) => new Set(v).size === 4, "Include each navigation item once"),
  name: text(100).min(1),
  role: text(120).min(1),
  headline: text(160).min(1),
  intro: text(1000),
  availability: text(100),
  location: text(100),
  portrait: mediaUrl,
  portraitAlt: text(200),
  aboutTitle: text(160),
  biography: text(5000),
  email: z.union([z.email(), z.literal("")]),
  phone: text(40),
  whatsapp: text(40).regex(/^[+\d\s-]*$/, "Use a phone number"),
  linkedin: safeUrl,
  github: safeUrl,
  facebook: safeUrl,
  resume: safeUrl,
  primaryCta: text(60),
  secondaryCta: text(60),
  contactTitle: text(180),
  contactIntro: text(1000),
  footer: text(250),
  seoTitle: text(100),
  seoDescription: text(300),
  socialImage: mediaUrl,
  accent: z.enum(["lime", "orange", "indigo"]),
  motion: z.boolean(),
  particleIntensity: z.number().min(0.2).max(1),
  sectionOrder: z
    .array(z.enum(sectionKeys))
    .length(6)
    .refine((v) => new Set(v).size === 6, "Include each section once"),
  hiddenSections: z.array(z.enum(sectionKeys)),
  navHome: text(40).min(1),
  navAbout: text(40).min(1),
  navProjects: text(40).min(1),
  navContact: text(40).min(1),
  servicesTitle: text(160),
  skillsTitle: text(160),
  experienceTitle: text(160),
  projectsTitle: text(160),
});
export type Settings = z.infer<typeof settingsSchema>;
export const kinds = ["projects", "skills", "services", "experience"] as const;
export type Kind = (typeof kinds)[number];
export const entrySchema = z
  .object({
    title: text(160).min(1),
    slug: text(150).regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and hyphens",
    ),
    summary: text(1200),
    category: text(100),
    tools: text(400),
    cover: mediaUrl,
    coverAlt: text(200),
    gallery: z.array(z.object({ url: mediaUrl, alt: text(200) })).max(12),
    challenge: text(6000),
    solution: text(6000),
    outcome: text(6000),
    metrics: text(2000),
    link: safeUrl,
    organization: text(160),
    start: text(10),
    end: text(10),
    current: z.boolean(),
    proficiency: text(80),
    icon: z.enum(["chart", "target", "layers", "code", "globe", "shield"]),
    order: z.number().int().min(0).max(9999),
    visible: z.boolean(),
    featured: z.boolean(),
    status: z.enum(["draft", "published"]),
    demo: z.boolean(),
    seoTitle: text(100),
    seoDescription: text(300),
  })
  .superRefine((v, ctx) => {
    for (const key of ["start", "end"] as const)
      if (v[key] && !/^\d{4}-\d{2}-\d{2}$/.test(v[key]))
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Use YYYY-MM-DD",
        });
    if (v.start && v.end && !v.current && v.end < v.start)
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "End date must follow start date",
      });
  });
export type Entry = z.infer<typeof entrySchema> & { _id: string; kind: Kind };
export const blankEntry: z.infer<typeof entrySchema> = {
  title: "",
  slug: "",
  summary: "",
  category: "",
  tools: "",
  cover: "",
  coverAlt: "",
  gallery: [],
  challenge: "",
  solution: "",
  outcome: "",
  metrics: "",
  link: "",
  organization: "",
  start: "",
  end: "",
  current: false,
  proficiency: "",
  icon: "chart",
  order: 0,
  visible: true,
  featured: false,
  status: "draft",
  demo: false,
  seoTitle: "",
  seoDescription: "",
};
export const defaultSettings: Settings = {
  brandWord: "emon",
  brandTagline: "ANALYTICS & INSIGHTS",
  logo: "",
  headerCta: "Let’s connect",
  aboutPageTitle: "People first.\nData informed.",
  projectsPageTitle: "Every setup.\nA clearer picture.",
  heroAnnotation: "MEASURING WHAT MATTERS",
  heroFlow: "DATA → CLARITY → GROWTH",
  heroFooter: "WEB ANALYTICS / CONVERSION TRACKING",
  heroCoord: "TRACKING SYSTEM / SIGNAL FLOW",
  expertiseStrip:
    "GOOGLE ANALYTICS 4, GOOGLE TAG MANAGER, META CONVERSION API, SERVER-SIDE TRACKING",
  navOrder: ["home", "about", "projects", "contact"],
  name: "Emtiaz Ahmed Emon",
  role: "Web Analyst & Tracking Specialist",
  headline: "Good data.\nBetter decisions.",
  intro:
    "I help you understand your users, connect the dots in your customer journey, and turn measurement into meaningful growth.",
  availability: "Open to new projects",
  location: "Bangladesh",
  portrait: "/emon-reference.jpeg",
  portraitAlt: "Emtiaz Ahmed Emon",
  aboutTitle: "Behind every click,\nthere’s a story.",
  biography:
    "I’m Emtiaz Ahmed Emon, a web analyst focused on making digital measurement clearer. I work with Google Tag Manager, GA4, Meta Pixel, and server-side tracking to help businesses understand user behavior and measure what matters.\n\nFrom a first tracking audit to a connected conversion setup, my focus is reliable data that helps you make informed decisions.",
  email: "",
  phone: "",
  whatsapp: "",
  linkedin: "",
  github: "",
  facebook: "",
  resume: "",
  primaryCta: "Let’s talk tracking",
  secondaryCta: "Explore my work",
  contactTitle: "Let’s make your\ndata work harder.",
  contactIntro:
    "Tell me what you’re working on, where your tracking falls short, and what you want to understand. We’ll take it from there.",
  footer: "Built with purpose. Measured with care.",
  seoTitle: "Emtiaz Ahmed Emon — Web Analyst & Tracking Specialist",
  seoDescription:
    "GA4, Google Tag Manager, Meta Pixel, Conversion API, and server-side tracking. Web analytics and measurement by Emtiaz Ahmed Emon.",
  socialImage: "",
  accent: "lime",
  motion: true,
  particleIntensity: 0.7,
  sectionOrder: [...sectionKeys],
  hiddenSections: [],
  navHome: "Home",
  navAbout: "About",
  navProjects: "Projects",
  navContact: "Contact",
  servicesTitle: "Clarity at every touchpoint.",
  skillsTitle: "The tools behind the insights.",
  experienceTitle: "Always learning. Always measuring.",
  projectsTitle: "A closer look at the work.",
};
const sample = (id: string, kind: Kind, fields: Partial<Entry>): Entry => ({
  ...blankEntry,
  _id: id,
  kind,
  status: "published",
  ...fields,
});
export const defaultEntries: Entry[] = [
  sample("demo-service-1", "services", {
    title: "Analytics & measurement",
    slug: "analytics-measurement",
    summary:
      "GA4 configuration, event planning, and reporting that answers your business questions.",
    icon: "chart",
    order: 0,
  }),
  sample("demo-service-2", "services", {
    title: "Conversion tracking",
    slug: "conversion-tracking",
    summary:
      "Understand which interactions lead to action with GTM, Meta Pixel, and Conversion API.",
    icon: "target",
    order: 1,
  }),
  sample("demo-service-3", "services", {
    title: "Server-side tracking",
    slug: "server-side-tracking",
    summary:
      "Connect your measurement infrastructure with thoughtful server-side event collection.",
    icon: "layers",
    order: 2,
  }),
  ...[
    "Google Analytics 4",
    "Google Tag Manager",
    "Meta Pixel",
    "Conversion API",
    "Server-side GTM",
    "Tracking audits",
  ].map((title, i) =>
    sample(`demo-skill-${i}`, "skills", {
      title,
      slug: `skill-${i}`,
      category: i < 2 ? "Analytics" : "Tracking",
      order: i,
    }),
  ),
  sample("demo-project-1", "projects", {
    title: "From clicks to a clearer customer journey",
    slug: "ga4-event-measurement",
    category: "GA4 / EVENT MEASUREMENT",
    summary:
      "An illustrative event measurement workflow for an e-commerce store.",
    tools: "GA4, Google Tag Manager, E-commerce",
    challenge:
      "An example store needs to understand its shopping funnel beyond page views.",
    solution:
      "Plan key events, configure tags and triggers, and validate the journey from product view to purchase.",
    outcome:
      "This is a sample case study structure. Replace it with verified project details and results before publishing.",
    demo: true,
    featured: true,
    order: 0,
  }),
  sample("demo-project-2", "projects", {
    title: "Connecting the conversion signals",
    slug: "meta-conversion-api",
    category: "META / SERVER-SIDE",
    summary: "An illustrative browser and server event tracking setup.",
    tools: "Meta Pixel, Conversion API, Server-side GTM",
    challenge:
      "An example business wants a clearer picture of conversions across browser and server signals.",
    solution:
      "Design the event flow, configure deduplication, and verify payload quality in testing tools.",
    outcome:
      "Sample content only. No client work or performance improvements are claimed.",
    demo: true,
    featured: true,
    order: 1,
  }),
];
export const contactSchema = z.object({
  name: text(100).min(2),
  email: z.email().max(254),
  service: text(100).min(1),
  message: text(5000).min(20),
  website: z.string().max(200).default(""),
});

import Portfolio from "@/components/site";
import { portfolio } from "@/lib/data";
import { appUrl } from "@/lib/env";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { settings: s } = await portfolio();
  return {
    title: { absolute: s.seoTitle },
    description: s.seoDescription,
    alternates: { canonical: appUrl() },
    openGraph: {
      title: s.seoTitle,
      description: s.seoDescription,
      ...(s.socialImage ? { images: [s.socialImage] } : {}),
    },
  };
}
export default async function Home() {
  const data = await portfolio();
  const json = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: data.settings.name,
    jobTitle: data.settings.role,
    url: appUrl(),
    sameAs: [
      data.settings.linkedin,
      data.settings.github,
      data.settings.facebook,
    ].filter(Boolean),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(json).replace(/</g, "\\u003c"),
        }}
      />
      <Portfolio {...data} />
    </>
  );
}

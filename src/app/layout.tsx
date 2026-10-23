import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Emtiaz Ahmed Emon — Web Analyst",
    template: "%s | Emtiaz Ahmed Emon",
  },
  description:
    "Web analytics, GA4, GTM, Conversion API and server-side tracking.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

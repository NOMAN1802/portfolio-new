import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-screen">
      <p className="eyebrow">404 / PAGE NOT FOUND</p>
      <h1>A missing signal.</h1>
      <p>This page may have moved or is no longer published.</p>
      <Link className="button primary" href="/">
        Back to home ↗
      </Link>
    </main>
  );
}

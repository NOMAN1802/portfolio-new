"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-screen">
      <p className="eyebrow">TEMPORARILY UNAVAILABLE</p>
      <h1>Let’s reconnect.</h1>
      <p>We couldn’t load the portfolio. Please try again in a moment.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}

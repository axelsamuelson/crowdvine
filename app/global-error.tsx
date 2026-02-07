"use client";

/**
 * Catches errors in the root layout (e.g. getCollections, getSiteContentByKey).
 * Without this, root-level errors can cause the app to show a blank/error page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const showDigest =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("vercel.app") ||
      process.env.NODE_ENV === "development");

  return (
    <html lang="en">
      <body>
        <div
          style={{
            padding: "2rem",
            maxWidth: "42rem",
            margin: "0 auto",
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.6,
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
            A critical error occurred. Please try again.
          </p>
          {showDigest && error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#666",
                fontFamily: "monospace",
                marginBottom: "1rem",
              }}
            >
              Digest: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              fontWeight: 500,
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "0.25rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

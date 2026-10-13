"use client";
import { useEffect, useState } from "react";

const FALLBACK_MESSAGE = "Your closed beta has ended, so this account is read-only. Contact us to extend your beta.";

// Mounted by the dashboard layout for closed-beta accounts only. The server refuses writes
// from an expired beta account with HTTP 403 and code BETA_READ_ONLY (see src/middleware.ts),
// but most forms ignore error responses, so the click looks like it did nothing. This watches
// fetch responses and shows the server's message on screen instead. It never changes a
// response: callers receive exactly what they would have received without it.
export function BetaReadOnlyNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const watchedFetch: typeof window.fetch = async (...args) => {
      const response = await originalFetch.apply(window, args);
      if (response.status === 403) {
        try {
          const body = await response.clone().json();
          if (body && body.code === "BETA_READ_ONLY") {
            setMessage(typeof body.error === "string" ? body.error : FALLBACK_MESSAGE);
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => setMessage(null), 12000);
          }
        } catch {
          // Not JSON, or nothing to show.
        }
      }
      return response;
    };

    window.fetch = watchedFetch;
    return () => {
      window.fetch = originalFetch;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!message) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-[100] w-full max-w-lg -translate-x-1/2 rounded-lg border border-red-500/40 bg-[#16181C] px-4 py-3 text-sm text-red-200 shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <p>{message}</p>
        <button type="button" className="text-xs text-graphite-400 hover:text-white" onClick={() => setMessage(null)}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
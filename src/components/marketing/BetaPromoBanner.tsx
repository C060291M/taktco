// Landing-page promo strip. Self-contained: uses only Tailwind arbitrary values,
// so it looks the same no matter how the rest of the theme is configured.
// Update SPOTS_LEFT as beta spots fill up (set it to 0 to hide the banner).
const SPOTS_LEFT: number = 3;

export function BetaPromoBanner() {
  if (SPOTS_LEFT <= 0) return null;
  const users = SPOTS_LEFT === 1 ? "USER" : "USERS";
  return (
    <section
      className="relative overflow-hidden border-y border-[#1FC6F2]/25 bg-[#060C13]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(31,198,242,0.05) 0 61px, transparent 61px 75px), radial-gradient(ellipse at 50% 50%, rgba(31,198,242,0.12), transparent 65%)"
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 text-center md:flex-row md:justify-between md:gap-8 md:text-left">
        <div>
          <p className="text-3xl font-black uppercase italic leading-none tracking-tight text-[#1FC6F2] sm:text-5xl">
            Free for 30 days
          </p>
          <p className="mt-2 text-lg font-extrabold uppercase italic text-[#F4F8FA] sm:text-2xl">
            To the next {SPOTS_LEFT} {users}!
          </p>
        </div>
        <a
          href="/signup"
          className="inline-flex items-center gap-2 rounded-full bg-[#1FC6F2] px-7 py-3 text-sm font-bold uppercase tracking-wide text-[#060C13] shadow-[0_0_40px_rgba(31,198,242,0.35)] transition hover:brightness-110 sm:text-base"
        >
          Join the beta at TAKTCO.org <span aria-hidden>&rarr;</span>
        </a>
      </div>
    </section>
  );
}

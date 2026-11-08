// Landing-page promo strip. Self-contained: uses only Tailwind arbitrary values.
// Shows how many closed-beta spots are left and removes itself when none remain.
export function BetaPromoBanner({ spotsLeft, total }: { spotsLeft: number; total: number }) {
  if (spotsLeft <= 0) return null;
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
            {spotsLeft === 1 ? "To the next user!" : `To the next ${spotsLeft} users!`}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 md:justify-start">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={
                  i < spotsLeft
                    ? "h-3 w-3 rounded-full bg-[#1FC6F2] shadow-[0_0_10px_rgba(31,198,242,0.8)]"
                    : "h-3 w-3 rounded-full bg-[#F4F8FA]/15"
                }
              />
            ))}
            <span className="ml-1 text-xs font-semibold uppercase tracking-widest text-[#F4F8FA]/70">
              {spotsLeft} of {total} spots left
            </span>
          </div>
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

import Link from "next/link";
import Image from "next/image";

// TAKTCO's own platform brand banner - used on public marketing surfaces
// (landing, login, signup). Intentionally NOT used inside the authenticated
// dashboard, where each tenant's own logo/colors take over instead - that
// split is the whole point of the white-label design.
export function NovaBanner() {
  return (
    <header className="border-b border-graphite-700 bg-graphite-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/taktco-logo.png" alt="TAKTCO" width={36} height={36} className="rounded" priority />
          <div className="leading-tight">
            <p className="text-white font-semibold tracking-wide">TAKTCO</p>
            <p className="text-[10px] text-graphite-400 tracking-[0.2em] uppercase">Beyond The Tape</p>
          </div>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-graphite-300 hover:text-white px-3 py-1.5">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary text-sm">
            Start free trial
          </Link>
        </nav>
      </div>
    </header>
  );
}

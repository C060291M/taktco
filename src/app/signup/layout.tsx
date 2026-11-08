import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { PageViewTracker } from "@/components/marketing/PageViewTracker";
import { getBetaSpotsLeft } from "@/lib/betaSpots";

export default async function SignupLayout({ children }: { children: ReactNode }) {
  // Beta full: don't let people fill in a form that would be rejected at the end.
  if ((await getBetaSpotsLeft()) <= 0) redirect("/#waitlist");
  return (
    <>
      <PageViewTracker path="/signup" />
      {children}
    </>
  );
}
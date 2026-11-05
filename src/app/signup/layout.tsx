import type { ReactNode } from "react";
import { PageViewTracker } from "@/components/marketing/PageViewTracker";

export default function SignupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageViewTracker path="/signup" />
      {children}
    </>
  );
}

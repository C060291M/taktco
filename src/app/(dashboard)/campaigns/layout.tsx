import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isBlockedFrom, fallbackPathFor } from "@/lib/permissions";

export default async function campaignsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");
  if (isBlockedFrom(ctx.user.role, "campaigns")) redirect(fallbackPathFor(ctx.user.role));
  return <>{children}</>;
}

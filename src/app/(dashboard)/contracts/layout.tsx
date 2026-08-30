import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isBlockedFrom, fallbackPathFor } from "@/lib/permissions";

export default async function contractsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");
  if (isBlockedFrom(ctx.user.role, "contracts")) redirect(fallbackPathFor(ctx.user.role));
  return <>{children}</>;
}

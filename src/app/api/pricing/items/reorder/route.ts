import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

const schema = z.object({
  categoryId: z.string(),
  orderedItemIds: z.array(z.string()).min(1)
});

// Reorders top-level items within a single category to match the given
// order (drag-and-drop) - the position of each id in the array becomes its
// new displayOrder. Add-ons aren't reordered here; they stay nested under
// their parent regardless of the parent's own position.
export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid reorder request." }, { status: 400 });

  const items = await db.pricingItem.findMany({
    where: { id: { in: parsed.data.orderedItemIds }, categoryId: parsed.data.categoryId, companyId: ctx.company.id }
  });
  if (items.length !== parsed.data.orderedItemIds.length) {
    return NextResponse.json({ error: "Some items don't belong to this category." }, { status: 400 });
  }

  await Promise.all(
    parsed.data.orderedItemIds.map((id, index) =>
      db.pricingItem.update({ where: { id }, data: { displayOrder: index } })
    )
  );

  return NextResponse.json({ ok: true });
}

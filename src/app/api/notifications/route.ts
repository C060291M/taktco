import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const category = req.nextUrl.searchParams.get("category");
  const includeArchived = req.nextUrl.searchParams.get("archived") === "true";

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: {
        companyId: ctx.company.id,
        archived: includeArchived ? undefined : false,
        ...(category ? { category: category as never } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    db.notification.count({ where: { companyId: ctx.company.id, read: false, archived: false } })
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

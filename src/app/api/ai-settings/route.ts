import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { encryptSecret, maskSecret } from "@/lib/crypto";

const schema = z.object({
  mode: z.enum(["NOVA_AI", "BYOAI"]),
  byoaiProvider: z.enum(["ANTHROPIC", "OPENAI", "GOOGLE_GEMINI", "XAI", "AZURE_OPENAI"]).optional(),
  byoaiModel: z.string().optional(),
  apiKey: z.string().optional() // plaintext in, only ever stored encrypted
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings, wallet] = await Promise.all([
    db.companyAiSettings.findUnique({ where: { companyId: ctx.company.id } }),
    db.aiCreditWallet.findUnique({ where: { companyId: ctx.company.id } })
  ]);

  return NextResponse.json({
    mode: settings?.mode || "NOVA_AI",
    byoaiProvider: settings?.byoaiProvider || null,
    byoaiModel: settings?.byoaiModel || null,
    connectionStatus: settings?.connectionStatus || "untested",
    hasKeyStored: Boolean(settings?.encryptedApiKey),
    wallet: wallet
      ? {
          includedCredits: wallet.includedCredits,
          purchasedCredits: wallet.purchasedCredits,
          usedThisCycle: wallet.usedThisCycle,
          remaining: wallet.includedCredits - wallet.usedThisCycle + wallet.purchasedCredits,
          cycleResetAt: wallet.cycleResetAt
        }
      : { includedCredits: 500, purchasedCredits: 0, usedThisCycle: 0, remaining: 500, cycleResetAt: null }
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER" && ctx.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can change AI settings." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid AI settings." }, { status: 400 });

  const data: Record<string, unknown> = { mode: parsed.data.mode };
  if (parsed.data.mode === "BYOAI") {
    if (!parsed.data.byoaiProvider) return NextResponse.json({ error: "Pick a provider." }, { status: 400 });
    data.byoaiProvider = parsed.data.byoaiProvider;
    data.byoaiModel = parsed.data.byoaiModel;
    if (parsed.data.apiKey) {
      data.encryptedApiKey = encryptSecret(parsed.data.apiKey);
      data.connectionStatus = "untested";
    }
  }

  const settings = await db.companyAiSettings.upsert({
    where: { companyId: ctx.company.id },
    create: { companyId: ctx.company.id, ...data },
    update: data
  });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "ai_settings_changed", entityType: "company", entityId: ctx.company.id }
  });

  return NextResponse.json({
    mode: settings.mode,
    byoaiProvider: settings.byoaiProvider,
    maskedKey: parsed.data.apiKey ? maskSecret(parsed.data.apiKey) : undefined
  });
}

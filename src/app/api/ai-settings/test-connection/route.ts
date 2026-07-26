import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { callAnthropic, callOpenAi, callGoogleGemini, callXai, callAzureOpenAi } from "@/lib/aiProviders";

export async function POST() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.companyAiSettings.findUnique({ where: { companyId: ctx.company.id } });
  if (!settings?.encryptedApiKey || !settings.byoaiProvider) {
    return NextResponse.json({ error: "No provider key saved yet." }, { status: 400 });
  }

  const apiKey = decryptSecret(settings.encryptedApiKey);
  const call = { apiKey, model: settings.byoaiModel || "", systemPrompt: "Reply with exactly: OK", userPrompt: "Reply with exactly: OK" };

  try {
    switch (settings.byoaiProvider) {
      case "ANTHROPIC": await callAnthropic(call); break;
      case "OPENAI": await callOpenAi(call); break;
      case "GOOGLE_GEMINI": await callGoogleGemini(call); break;
      case "XAI": await callXai(call); break;
      case "AZURE_OPENAI": await callAzureOpenAi(call); break;
    }
    await db.companyAiSettings.update({ where: { companyId: ctx.company.id }, data: { connectionStatus: "connected", lastTestedAt: new Date() } });
    return NextResponse.json({ status: "connected" });
  } catch (err) {
    await db.companyAiSettings.update({ where: { companyId: ctx.company.id }, data: { connectionStatus: "failed", lastTestedAt: new Date() } });
    return NextResponse.json({ status: "failed", error: err instanceof Error ? err.message : "Connection failed." }, { status: 502 });
  }
}

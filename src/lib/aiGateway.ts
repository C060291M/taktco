import { db } from "@/database/client";
import { askClaude } from "@/lib/ai";
import { decryptSecret } from "@/lib/crypto";
import { callAnthropic, callOpenAi, callGoogleGemini, callXai, callAzureOpenAi } from "@/lib/aiProviders";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("INSUFFICIENT_CREDITS");
  }
}

const DEFAULT_FEATURE_COSTS: Record<string, number> = {
  quick_question: 1,
  email_draft: 3,
  estimate_builder: 5,
  contract_builder: 5,
  marketing_post: 3,
  business_analysis: 5
};

export async function getOrCreateWallet(companyId: string) {
  const existing = await db.aiCreditWallet.findUnique({ where: { companyId } });
  if (existing) return existing;
  return db.aiCreditWallet.create({
    data: { companyId, includedCredits: 500, cycleResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
  });
}

export async function getFeatureCost(feature: string): Promise<number> {
  const row = await db.aiFeatureCost.findUnique({ where: { feature } });
  return row?.credits ?? DEFAULT_FEATURE_COSTS[feature] ?? 1;
}

// For callers that need TAKTCO AI credit gating but can't go through
// generateWithGateway (e.g. JSON-mode structured generation) - checks and
// deducts credits, logs usage, and lets the caller do the actual AI call.
// Throws InsufficientCreditsError before any AI call is made if the company
// is out of credits and in BYOAI mode - callers should check settings.mode
// themselves for BYOAI passthrough.
export async function deductCredits(companyId: string, feature: string) {
  const cost = await getFeatureCost(feature);
  const wallet = await getOrCreateWallet(companyId);
  const remaining = wallet.includedCredits - wallet.usedThisCycle + wallet.purchasedCredits;
  if (remaining < cost) throw new InsufficientCreditsError();

  const fromIncluded = Math.min(cost, wallet.includedCredits - wallet.usedThisCycle);
  const fromPurchased = cost - fromIncluded;
  await db.aiCreditWallet.update({
    where: { companyId },
    data: { usedThisCycle: wallet.usedThisCycle + fromIncluded, purchasedCredits: wallet.purchasedCredits - fromPurchased }
  });
  return cost;
}

// The single entry point every AI-powered feature in the app should call
// instead of talking to a provider directly. Handles routing between TAKTCO AI
// (our own Anthropic key, credit-metered) and BYOAI (the company's own key,
// no credit cost to them), and logs every call to AiUsageLog either way.
export async function generateWithGateway(params: {
  companyId: string;
  feature: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const settings = await db.companyAiSettings.findUnique({ where: { companyId: params.companyId } });
  const mode = settings?.mode || "NOVA_AI";
  const start = Date.now();

  if (mode === "BYOAI" && settings?.encryptedApiKey && settings.byoaiProvider) {
    try {
      const apiKey = decryptSecret(settings.encryptedApiKey);
      const call = { apiKey, model: settings.byoaiModel || "", systemPrompt: params.systemPrompt, userPrompt: params.userPrompt };
      let result: string;
      switch (settings.byoaiProvider) {
        case "ANTHROPIC": result = await callAnthropic(call); break;
        case "OPENAI": result = await callOpenAi(call); break;
        case "GOOGLE_GEMINI": result = await callGoogleGemini(call); break;
        case "XAI": result = await callXai(call); break;
        case "AZURE_OPENAI": result = await callAzureOpenAi(call); break;
        default: throw new Error("Unknown provider.");
      }
      await db.aiUsageLog.create({
        data: {
          companyId: params.companyId, mode: "BYOAI", provider: settings.byoaiProvider,
          model: settings.byoaiModel || "default", feature: params.feature, creditsUsed: 0,
          responseTimeMs: Date.now() - start, status: "success"
        }
      });
      return result;
    } catch (err) {
      await db.aiUsageLog.create({
        data: {
          companyId: params.companyId, mode: "BYOAI", provider: settings.byoaiProvider,
          model: settings.byoaiModel || "default", feature: params.feature, creditsUsed: 0,
          responseTimeMs: Date.now() - start, status: "failed",
          errorMessage: err instanceof Error ? err.message : "Unknown error"
        }
      });
      throw err;
    }
  }

  // TAKTCO AI mode (default): credit-metered, uses our own Anthropic key.
  const cost = await deductCredits(params.companyId, params.feature);

  try {
    const result = await askClaude(params.systemPrompt, params.userPrompt);
    await db.aiUsageLog.create({
      data: {
        companyId: params.companyId, mode: "NOVA_AI", provider: "ANTHROPIC", model: "claude-sonnet-5",
        feature: params.feature, creditsUsed: cost, responseTimeMs: Date.now() - start, status: "success"
      }
    });
    return result;
  } catch (err) {
    await db.aiUsageLog.create({
      data: {
        companyId: params.companyId, mode: "NOVA_AI", provider: "ANTHROPIC", model: "claude-sonnet-5",
        feature: params.feature, creditsUsed: 0, responseTimeMs: Date.now() - start, status: "failed",
        errorMessage: err instanceof Error ? err.message : "Unknown error"
      }
    });
    throw err;
  }
}

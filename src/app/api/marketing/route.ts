import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { generateWithGateway, InsufficientCreditsError } from "@/lib/aiGateway";

const PLATFORM_STYLE: Record<string, string> = {
  FACEBOOK: "a friendly, community-toned Facebook post, 2-4 sentences, ending with a light call to action",
  INSTAGRAM: "an energetic Instagram caption, short punchy sentences, followed by 5-8 relevant hashtags on their own line",
  GOOGLE_BUSINESS: "a Google Business Profile update, factual and local-search-friendly, 2-3 sentences",
  LINKEDIN: "a professional LinkedIn post, 3-5 sentences, positioning the business as skilled and reliable",
  X: "a punchy X (Twitter) post under 280 characters, 1-2 relevant hashtags",
  TIKTOK: "a short, casual TikTok video caption with a hook in the first line, plus 3-5 hashtags",
  YOUTUBE: "a YouTube video description: a 2-sentence hook, then a short paragraph, then relevant keywords on their own line",
  BLOG: "a short blog article, 4-6 short paragraphs with a simple headline at the top",
  NEWSLETTER: "a short customer newsletter blurb, warm and personal, 3-5 sentences",
  EMAIL: "a marketing email: a subject line on the first line, then 3-5 short paragraphs",
  SMS: "a single SMS message under 160 characters, friendly and direct, no hashtags"
};

const genSchema = z.object({
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "GOOGLE_BUSINESS", "LINKEDIN", "X", "TIKTOK", "YOUTUBE", "BLOG", "NEWSLETTER", "EMAIL", "SMS"]),
  prompt: z.string().min(3),
  jobId: z.string().optional()
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db.marketingContent.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return NextResponse.json(items);
}

// Generates content with Claude and saves it in one step. Needs ANTHROPIC_API_KEY -
// see src/lib/ai.ts.
export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = genSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Describe what you want a post about." }, { status: 400 });

  const style = PLATFORM_STYLE[parsed.data.platform];
  let projectContext = "";
  if (parsed.data.jobId) {
    const job = await db.job.findFirst({
      where: { id: parsed.data.jobId, companyId: ctx.company.id },
      include: { customer: true }
    });
    if (job) {
      projectContext = ` This post is about a completed project for a customer in ${job.customer.address || ctx.company.serviceArea || "the area"}. Don't use the customer's real name - refer to them generically (e.g. "a homeowner in [city]").`;
    }
  }

  const voiceContext = ctx.company.brandVoice ? ` Write in a ${ctx.company.brandVoice.toLowerCase()} tone.` : "";
  const audienceContext = ctx.company.targetAudience ? ` Your audience is: ${ctx.company.targetAudience}.` : "";
  const systemPrompt = `You write marketing content for ${ctx.company.name}, a ${ctx.company.tradeType || "home service"} business${
    ctx.company.serviceArea ? ` serving ${ctx.company.serviceArea}` : ""
  }.${voiceContext}${audienceContext} Write ${style}.${projectContext} Write only the post content itself - no preamble, no explanation, no quotation marks around it.`;

  let content: string;
  try {
    content = await generateWithGateway({
      companyId: ctx.company.id,
      feature: "marketing_post",
      systemPrompt,
      userPrompt: parsed.data.prompt
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI generation failed." }, { status: 502 });
  }

  const saved = await db.marketingContent.create({
    data: {
      companyId: ctx.company.id,
      jobId: parsed.data.jobId,
      platform: parsed.data.platform,
      prompt: parsed.data.prompt,
      content
    }
  });

  return NextResponse.json(saved, { status: 201 });
}

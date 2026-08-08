import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { hashPassword, createSession } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { sendPlatformSystemEmail } from "@/lib/platformEmail";
import { welcomeEmail } from "@/emails/welcome-email";

const schema = z.object({
  companyName: z.string().min(2),
  tradeType: z.string().min(2),
  serviceArea: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal("")),
  businessAddress: z.string().optional(),
  taxRate: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  // Data URL (base64) from the drag-and-drop uploader on the signup page.
  // Fine for local/dev - production should upload this to S3/R2 and store a real
  // URL here instead, per the blueprint's file-upload TODO.
  logoUrl: z.string().optional(),
  brandAccentColor: z.string().optional()
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit(`signup:${clientIp(req)}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });
  }
  const {
    companyName,
    tradeType,
    serviceArea,
    businessPhone,
    businessEmail,
    businessAddress,
    taxRate,
    name,
    email: rawEmail,
    password,
    logoUrl,
    brandAccentColor
  } = parsed.data;
  const email = rawEmail.toLowerCase().trim();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  let subdomain = slugify(companyName) || "company";
  let suffix = 0;
  while (await db.company.findUnique({ where: { subdomain } })) {
    suffix += 1;
    subdomain = `${slugify(companyName)}-${suffix}`;
  }

  const passwordHash = await hashPassword(password);

  const company = await db.company.create({
    data: {
      name: companyName,
      subdomain,
      tradeType,
      serviceArea,
      businessPhone: businessPhone || undefined,
      businessEmail: businessEmail || undefined,
      businessAddress: businessAddress || undefined,
      taxRate: taxRate ? Number(taxRate) : undefined,
      logoUrl,
      brandAccentColor: brandAccentColor || undefined,
      users: {
        create: { email, passwordHash, name, role: "OWNER" }
      }
    },
    include: { users: true }
  });

  const owner = company.users[0];
  await createSession({ userId: owner.id, companyId: company.id, role: owner.role });

  // Best-effort, never blocks signup - a missing welcome email should
  // never be the reason someone can't create an account.
  const welcomeEmailContent = welcomeEmail({
    companyName: company.name,
    ownerName: owner.name,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  });
  sendPlatformSystemEmail({ toEmail: owner.email, subject: welcomeEmailContent.subject, html: welcomeEmailContent.html, companyId: company.id }).catch(() => {});

  return NextResponse.json({ ok: true });
}

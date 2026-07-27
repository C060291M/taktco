import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

const schema = z.object({
  companyName: z.string().min(2),
  tradeType: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });
  }
  const { companyName, tradeType, name, email, password } = parsed.data;

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
      users: {
        create: { email, passwordHash, name, role: "OWNER" }
      }
    },
    include: { users: true }
  });

  const owner = company.users[0];
  await createSession({ userId: owner.id, companyId: company.id, role: owner.role });

  return NextResponse.json({ ok: true });
}

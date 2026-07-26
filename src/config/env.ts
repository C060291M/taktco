import { z } from "zod";

// Centralized, validated environment access. Import `env` instead of reading
// process.env directly elsewhere in the app - this fails fast with a clear
// error at startup if something required is missing, instead of a confusing
// runtime crash three requests later.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  NEXT_PUBLIC_APP_URL: z.string().optional(),

  // AI features (Marketing AI, TAKTCO AI) - optional, both fail gracefully without it
  ANTHROPIC_API_KEY: z.string().optional(),

  // Configured only, not implemented yet - see README §5
  OPENAI_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional()
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.errors.map((e) => e.path.join(".")).join(", ");
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }
  return parsed.data;
}

export const env = loadEnv();

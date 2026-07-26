"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { NovaBanner } from "@/components/marketing/NovaBanner";
import { LogoDropzone } from "@/components/forms/LogoDropzone";
import { WizardSteps } from "@/components/forms/WizardSteps";

const PRESET_COLORS = ["#1EAEC4", "#22D3EE", "#3B82F6", "#A855F7", "#F97316", "#22C55E"];
const STEPS = ["Business", "Contact & tax", "Branding", "Your account"];

const schema = z.object({
  companyName: z.string().min(2, "Enter your company name"),
  tradeType: z.string().min(1, "Pick a trade"),
  serviceArea: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  businessAddress: z.string().optional(),
  taxRate: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 100), "Enter a percent between 0 and 100"),
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters")
});

type FormValues = z.infer<typeof schema>;

const STEP_FIELDS: (keyof FormValues)[][] = [
  ["companyName", "tradeType", "serviceArea"],
  ["businessPhone", "businessEmail", "businessAddress", "taxRate"],
  [],
  ["name", "email", "password"]
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [accent, setAccent] = useState(PRESET_COLORS[0]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors }
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onBlur" });

  async function next() {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setServerError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, logoUrl, brandAccentColor: accent })
    });
    setLoading(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setServerError(data.error || "Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen bg-graphite-950" style={{ ["--brand-accent" as string]: accent }}>
      <NovaBanner />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-white">Welcome to TAKTCO</h1>
            <p className="text-graphite-400 text-sm mt-1">Your construction business operating system — a few short steps, and it'll already look like your company.</p>
          </div>

          <WizardSteps steps={STEPS} currentStep={step} />

          <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
            {step === 0 && (
              <div className="space-y-3">
                <div>
                  <input className="input" placeholder="Company name" {...register("companyName")} />
                  {errors.companyName && <p className="text-xs text-red-400 mt-1">{errors.companyName.message}</p>}
                </div>
                <div>
                  <select className="input" {...register("tradeType")}>
                    <option value="">What do you do?</option>
                    <option>Fencing</option>
                    <option>General Contracting</option>
                    <option>Electrical</option>
                    <option>HVAC</option>
                    <option>Plumbing</option>
                    <option>Landscaping</option>
                    <option>Roofing</option>
                    <option>Concrete</option>
                    <option>Painting</option>
                    <option>Other</option>
                  </select>
                  {errors.tradeType && <p className="text-xs text-red-400 mt-1">{errors.tradeType.message}</p>}
                </div>
                <input className="input" placeholder="Service area (e.g. Dallas–Fort Worth)" {...register("serviceArea")} />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <p className="text-xs text-graphite-500">All optional — you can fill these in later from Settings.</p>
                <input className="input" placeholder="Business phone" {...register("businessPhone")} />
                <div>
                  <input className="input" placeholder="Business email" {...register("businessEmail")} />
                  {errors.businessEmail && <p className="text-xs text-red-400 mt-1">{errors.businessEmail.message}</p>}
                </div>
                <input className="input" placeholder="Business address" {...register("businessAddress")} />
                <div>
                  <input className="input" placeholder="Default tax rate (%)" inputMode="decimal" {...register("taxRate")} />
                  {errors.taxRate && <p className="text-xs text-red-400 mt-1">{errors.taxRate.message}</p>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-graphite-300 uppercase tracking-wide mb-2">Your logo</p>
                  <LogoDropzone onChange={(dataUrl) => setLogoUrl(dataUrl)} />
                </div>
                <div>
                  <p className="text-xs font-medium text-graphite-300 uppercase tracking-wide mb-2">Brand color</p>
                  <div className="flex gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAccent(c)}
                        className="h-8 w-8 rounded-full border-2"
                        style={{ backgroundColor: c, borderColor: accent === c ? "#fff" : "transparent" }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                  <button type="button" className="btn-primary text-sm mt-2">This is your accent color</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div>
                  <input className="input" placeholder="Your name" {...register("name")} />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <input className="input" placeholder="Email" {...register("email")} />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <input className="input" placeholder="Password" type="password" {...register("password")} />
                  {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
                </div>
                <p className="text-[11px] text-graphite-500">
                  Payment setup happens later, in Settings — no bank or tax info needed to get started.
                </p>
              </div>
            )}

            {serverError && <p className="text-sm text-red-400">{serverError}</p>}

            <div className="flex justify-between pt-2">
              {step > 0 ? (
                <button type="button" className="btn-secondary" onClick={back}>Back</button>
              ) : (
                <a href="/login" className="text-xs text-graphite-400 hover:underline self-center">Already have an account?</a>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" className="btn-primary" onClick={next}>Continue</button>
              ) : (
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "Creating your workspace..." : "Create company workspace"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import { db } from "@/database/client";

// Central error capture - call this from a catch block instead of just
// console.error, so failures are visible in the Admin Error Console rather
// than only in server logs nobody's watching yet. Never throws itself (a
// logging call failing shouldn't cause a second failure) - swallows its own
// errors after a best-effort console.error fallback.
export async function logError(params: {
  companyId?: string;
  userId?: string;
  module: "API" | "AI" | "STRIPE" | "STORAGE" | "EMAIL" | "SMS" | "UNHANDLED" | "VALIDATION" | "PERMISSION";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  stackTrace?: string;
  route?: string;
  recoveryAction?: string;
}) {
  try {
    await db.errorLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        module: params.module,
        severity: params.severity || "MEDIUM",
        message: params.message.slice(0, 2000),
        stackTrace: params.stackTrace?.slice(0, 4000),
        route: params.route,
        recoveryAction: params.recoveryAction
      }
    });
  } catch (err) {
    console.error("logError itself failed:", err);
    console.error("original error:", params.message);
  }
}

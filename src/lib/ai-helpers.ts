// Shared AI helpers for beautyWellnes (NailFlow AI)
// - Standardized model: anthropic/claude-3-5-sonnet-20241022
// - parseAIJson: 3-strategy JSON parser
// - aiRateLimiter: 20 calls/hour per identity
// - persistAIResult: writes ai_results JSONB rows + AIAuditLog mirror

import prisma from "@/lib/prisma";

export const DEFAULT_AI_MODEL =
  process.env.OPENROUTER_MODEL || "anthropic/claude-3-5-sonnet-20241022";

export function parseAIJson<T = any>(text: string): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch {}
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {}
  }
  const aStart = text.indexOf("[");
  const aEnd = text.lastIndexOf("]");
  if (aStart !== -1 && aEnd > aStart) {
    try {
      return JSON.parse(text.slice(aStart, aEnd + 1)) as T;
    } catch {}
  }
  return null;
}

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = Number(process.env.AI_RATE_PER_HOUR ?? 20);
const aiCalls = new Map<string, number[]>();

export interface AIRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function aiRateLimiter(identity: string): AIRateLimitResult {
  const now = Date.now();
  const list = (aiCalls.get(identity) || []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (list.length >= RATE_MAX) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: list[0] + RATE_WINDOW_MS,
    };
  }
  list.push(now);
  aiCalls.set(identity, list);
  return {
    allowed: true,
    remaining: RATE_MAX - list.length,
    resetAt: now + RATE_WINDOW_MS,
  };
}

export async function persistAIResult(params: {
  salonId?: string | null;
  userId?: string | null;
  feature: string;
  input: any;
  output: any;
  model: string;
  tokens?: number;
  durationMs?: number;
}) {
  // Write to ai_results pool (preferred) and AIAuditLog (existing model in this schema).
  try {
    if ((prisma as any).aiResult?.create) {
      await (prisma as any).aiResult.create({
        data: {
          feature: params.feature,
          salonId: params.salonId || null,
          userId: params.userId || null,
          model: params.model,
          input: params.input as any,
          output: params.output as any,
          tokens: params.tokens || null,
          durationMs: params.durationMs || null,
        },
      });
    }
  } catch (err) {
    console.warn("persistAIResult failed", err);
  }

  // Mirror to existing AIAuditLog model so the in-app /ai-audit page keeps working.
  try {
    if ((prisma as any).aIAuditLog?.create && params.salonId) {
      // Map our generic feature names onto the existing AIContextType enum.
      const featureToCtx: Record<string, string> = {
        multilang_reminder: "MULTILANG",
        reminder: "REMINDER",
        loyalty: "LOYALTY",
        kpi: "KPI",
        review_request: "REVIEW",
        visit_notes: "VISIT_NOTES",
        reschedule: "RESCHEDULE",
        service_recommend: "SERVICE_RECOMMEND",
        chat: "CHAT",
        staff_insights: "STAFF_INSIGHTS",
        noshow_predict: "NOSHOW_PREDICT",
        marketing: "MARKETING",
      };
      const contextType = featureToCtx[params.feature] || "CHAT";

      await (prisma as any).aIAuditLog.create({
        data: {
          salonId: params.salonId,
          contextType,
          inputSummary: (typeof params.input === "string"
            ? params.input
            : JSON.stringify(params.input)
          ).slice(0, 1000),
          outputSummary: (typeof params.output === "string"
            ? params.output
            : JSON.stringify(params.output)
          ).slice(0, 2000),
        },
      });
    }
  } catch {
    // best-effort
  }
}

export function identifyAIRequest(
  user: { id?: string | null } | null | undefined,
  req: Request
): string {
  if (user?.id) return `user:${user.id}`;
  const headers = (req as any).headers as Headers;
  const fwd = headers.get?.("x-forwarded-for") || "";
  const ip = fwd.split(",")[0]?.trim() || "anon";
  return `ip:${ip}`;
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import openRouterClient from '@/lib/openRouterClient';
import { AIContextType } from '@prisma/client';

/**
 * Apply pass 5 — additive AI endpoint.
 * Env: OPENROUTER_API_KEY (required). Returns 503 + missing field when unset.
 *
 * PRODUCT-DECISION: Uses AIContextType.KPI for audit logging (closest existing
 * enum value). Adding a new RETENTION enum is a Prisma migration -> TOO-RISKY.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI not configured: OPENROUTER_API_KEY is missing', missing: 'OPENROUTER_API_KEY' },
        { status: 503 }
      );
    }

    const { timeframeDays, segment, recentChurnSignals, retentionGoals } = await request.json();

    const userPrompt = `Forecast salon client retention risk and propose interventions.

Timeframe: next ${timeframeDays || 90} days
Segment: ${segment || 'all active clients'}
Recent churn signals: ${Array.isArray(recentChurnSignals) ? recentChurnSignals.join('; ') : (recentChurnSignals || 'none specified')}
Retention goals: ${retentionGoals || 'reduce 60-day churn by 10%'}

Return ONLY valid JSON:
{
  "risk_segments": [{ "segment": "string", "churn_risk_pct": 0, "key_drivers": ["string"] }],
  "early_warning_signals": ["string"],
  "intervention_playbook": [{ "trigger": "string", "action": "string", "expected_impact": "string" }],
  "win_back_offers": [{ "offer": "string", "target_segment": "string" }],
  "kpi_targets_90d": [{ "metric": "string", "current": "string", "target": "string" }],
  "summary": "string"
}`;

    const content = await openRouterClient.generate({
      systemPrompt: 'You are a salon CRM analyst. Return strict JSON only.',
      userPrompt,
      temperature: 0.3,
    });

    let parsed: unknown = null;
    try { parsed = JSON.parse(content); } catch {
      const s = content.indexOf('{');
      const e = content.lastIndexOf('}');
      if (s >= 0 && e > s) { try { parsed = JSON.parse(content.slice(s, e + 1)); } catch {} }
    }

    await prisma.aIAuditLog.create({
      data: {
        salonId: session.user.salonId,
        contextType: AIContextType.KPI,
        inputSummary: `retention-forecast: ${timeframeDays || 90}d, segment=${segment || 'all'}`,
        outputSummary: content.substring(0, 500),
      },
    });

    return NextResponse.json({ content, parsed });
  } catch (error) {
    console.error('retention-forecast error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate retention forecast';
    if (msg.includes('OPENROUTER_API_KEY')) {
      return NextResponse.json({ error: msg, missing: 'OPENROUTER_API_KEY' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to generate retention forecast' }, { status: 500 });
  }
}

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
 * PRODUCT-DECISION: audit logged under AIContextType.SERVICE_RECOMMEND (closest fit).
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

    const { clientId, clientName, currentService, recentServices, preferences, budgetTier } = await request.json();

    if (!clientName && !clientId) {
      return NextResponse.json({ error: 'clientName or clientId required' }, { status: 400 });
    }

    const userPrompt = `Suggest tasteful upsells/cross-sells for an in-progress salon visit.

Client: ${clientName || `id=${clientId}`}
Current service: ${currentService || 'unspecified'}
Recent services: ${Array.isArray(recentServices) ? recentServices.join('; ') : (recentServices || 'none')}
Preferences: ${preferences || 'unspecified'}
Budget tier: ${budgetTier || 'mid'}

Return ONLY valid JSON:
{
  "suggestions": [{
    "service_or_product": "string",
    "rationale": "string",
    "approx_price_band": "string",
    "pitch_one_liner": "string",
    "do_not_pressure_note": "string"
  }],
  "best_opener": "string",
  "ethical_guardrails": ["string"]
}`;

    const content = await openRouterClient.generate({
      systemPrompt: 'You are a salon front-desk coach. Recommend ethical, non-pushy upsells. Return strict JSON only.',
      userPrompt,
      temperature: 0.4,
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
        clientId: clientId || null,
        contextType: AIContextType.SERVICE_RECOMMEND,
        inputSummary: `upsell-suggester: client=${clientName || clientId} current=${currentService || 'n/a'}`,
        outputSummary: content.substring(0, 500),
      },
    });

    return NextResponse.json({ content, parsed });
  } catch (error) {
    console.error('upsell-suggester error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate upsell suggestions';
    if (msg.includes('OPENROUTER_API_KEY')) {
      return NextResponse.json({ error: msg, missing: 'OPENROUTER_API_KEY' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to generate upsell suggestions' }, { status: 500 });
  }
}

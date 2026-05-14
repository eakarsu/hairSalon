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
 * PRODUCT-DECISION: audit logged under AIContextType.MARKETING (closest existing
 * value; tips are post-visit content). Adding WELLNESS enum is TOO-RISKY (Prisma migration).
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

    const { topic, clientName, season, language, lengthHint } = await request.json();
    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const userPrompt = `Write a short, friendly post-visit wellness/care tip sheet for a salon client.

Topic: ${topic}
Client: ${clientName || 'valued client'}
Season: ${season || 'current season'}
Language: ${language || 'English'}
Length: ${lengthHint || 'about 120 words plus 4-6 quick bullets'}

Return ONLY valid JSON:
{
  "title": "string",
  "intro": "string",
  "tips": ["string"],
  "do_nots": ["string"],
  "when_to_call_us": ["string"],
  "social_caption": "string"
}

Important: do not provide medical advice; suggest seeing a professional for medical concerns.`;

    const content = await openRouterClient.generate({
      systemPrompt: 'You are a salon-owner-friendly content writer. Avoid medical claims. Return strict JSON only.',
      userPrompt,
      temperature: 0.6,
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
        contextType: AIContextType.MARKETING,
        inputSummary: `wellness-tips: ${topic} (${language || 'en'})`,
        outputSummary: content.substring(0, 500),
      },
    });

    return NextResponse.json({ content, parsed });
  } catch (error) {
    console.error('wellness-tips error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate wellness tips';
    if (msg.includes('OPENROUTER_API_KEY')) {
      return NextResponse.json({ error: msg, missing: 'OPENROUTER_API_KEY' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to generate wellness tips' }, { status: 500 });
  }
}

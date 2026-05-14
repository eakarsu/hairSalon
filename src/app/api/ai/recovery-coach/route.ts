// Custom feature (batch_09): Recovery coach module — post-service care plans.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import openRouterClient from '@/lib/openRouterClient';

function parseJSON(t: string) {
  if (!t) return null;
  const c = t.replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const m = c.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: 'AI not configured', missing: 'OPENROUTER_API_KEY' }, { status: 503 });

    const body = await req.json().catch(() => ({} as any));
    const { service, clientProfile, sensitivities } = body || {};
    if (!service) return NextResponse.json({ error: 'service required' }, { status: 400 });

    const content = await openRouterClient.generate({
      systemPrompt: 'You produce a multi-day post-service recovery / aftercare plan. Conservative, non-medical. JSON only.',
      userPrompt: `SERVICE: ${service}\nCLIENT_PROFILE: ${JSON.stringify(clientProfile || {})}\nSENSITIVITIES: ${JSON.stringify(sensitivities || [])}\nReturn JSON {"day_by_day":[{"day":0,"actions":[""],"avoid":[""]}],"red_flags":[""],"product_recommendations":[{"name":"","why":""}],"follow_up_in_days":0}`,
      maxTokens: 1500,
      temperature: 0.4,
    });

    return NextResponse.json({ type: 'recovery-coach', result: parseJSON(content) || { raw: content } });
  } catch (e: any) {
    console.error('recovery-coach error:', e.message);
    return NextResponse.json({ error: e.message || 'internal error' }, { status: 500 });
  }
}

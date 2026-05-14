// Custom feature (batch_09): Corporate-wellness B2B portal orchestration.
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
    const { companyName, headcount, programGoals, budget } = body || {};
    if (!companyName) return NextResponse.json({ error: 'companyName required' }, { status: 400 });

    const content = await openRouterClient.generate({
      systemPrompt: 'You design corporate-wellness programs for spas/salons. JSON only.',
      userPrompt: `COMPANY: ${companyName}\nHEADCOUNT: ${headcount || 'unknown'}\nGOALS: ${programGoals || 'general wellness'}\nBUDGET_USD_MO: ${budget || 'open'}\nReturn JSON {"program_name":"","tiers":[{"name":"","services_per_month":0,"price_per_employee_usd":0}],"recommended_services":[""],"engagement_plan":[""],"reporting_kpis":[""]}`,
      maxTokens: 1500,
      temperature: 0.4,
    });

    return NextResponse.json({ type: 'corporate-wellness', result: parseJSON(content) || { raw: content } });
  } catch (e: any) {
    console.error('corporate-wellness error:', e.message);
    return NextResponse.json({ error: e.message || 'internal error' }, { status: 500 });
  }
}

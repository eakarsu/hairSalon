// Custom feature (batch_09): Predictive supply ordering by service mix.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
    const { horizonDays = 30, currentInventory } = body || {};

    // Pull last 60 days of appointments for service mix context (best-effort)
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const appointments = await (prisma as any).appointment
      ?.findMany({
        where: { salonId: session.user.salonId, scheduledStart: { gte: since } },
        take: 200,
        select: { scheduledStart: true, serviceName: true, status: true },
      })
      .catch(() => []);

    const content = await openRouterClient.generate({
      systemPrompt: 'You forecast salon supply consumption from service mix and recommend reorder quantities. JSON only.',
      userPrompt: `HORIZON_DAYS: ${horizonDays}\nINVENTORY: ${JSON.stringify(currentInventory || [])}\nRECENT_SERVICES: ${JSON.stringify((appointments || []).slice(0, 100))}\nReturn JSON {"reorder_lines":[{"sku":"","qty":0,"unit":"","reason":""}],"runout_risks":[{"sku":"","days_until_runout":0}],"total_estimated_cost_usd":0}`,
      maxTokens: 1600,
      temperature: 0.3,
    });

    return NextResponse.json({ type: 'supply-prediction', result: parseJSON(content) || { raw: content } });
  } catch (e: any) {
    console.error('supply-prediction error:', e.message);
    return NextResponse.json({ error: e.message || 'internal error' }, { status: 500 });
  }
}

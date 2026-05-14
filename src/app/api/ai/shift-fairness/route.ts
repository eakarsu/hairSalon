// Custom feature (batch_09): AI-driven shift fairness optimization.
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
    const { staffRoster, currentSchedule, fairnessGoals } = body || {};
    if (!Array.isArray(staffRoster)) return NextResponse.json({ error: 'staffRoster array required' }, { status: 400 });

    const content = await openRouterClient.generate({
      systemPrompt: 'You audit a salon shift schedule for fairness (weekend share, peak share, overtime) and propose adjustments. JSON only.',
      userPrompt: `STAFF: ${JSON.stringify(staffRoster.slice(0, 30))}\nSCHEDULE: ${JSON.stringify(currentSchedule || {}).slice(0, 4000)}\nGOALS: ${JSON.stringify(fairnessGoals || ['equal weekend share', 'cap consecutive shifts'])}\nReturn JSON {"fairness_score":0,"disparities":[{"staff_id":"","metric":"","gap":0}],"swap_recommendations":[{"from":"","to":"","shift":""}],"rationale":""}`,
      maxTokens: 1800,
      temperature: 0.3,
    });

    return NextResponse.json({ type: 'shift-fairness', result: parseJSON(content) || { raw: content } });
  } catch (e: any) {
    console.error('shift-fairness error:', e.message);
    return NextResponse.json({ error: e.message || 'internal error' }, { status: 500 });
  }
}

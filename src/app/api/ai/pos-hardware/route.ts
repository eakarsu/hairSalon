// Custom feature (batch_09): POS hardware integration helper.
// Helps with terminal pairing, last-receipt diagnostics, and tip-flow optimization.
// TODO: configure credentials for POS_VENDOR_API_KEY (Square/Stripe Terminal/Clover).
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
    const { action, terminalId, recentTransactions, problem } = body || {};
    if (!action) return NextResponse.json({ error: 'action required (pair|diagnose|optimize)' }, { status: 400 });

    const vendorConfigured = Boolean(process.env.POS_VENDOR_API_KEY);

    const content = await openRouterClient.generate({
      systemPrompt: 'You assist a salon owner with POS terminal pairing, diagnostics, and tip-flow optimization. JSON only.',
      userPrompt: `ACTION: ${action}\nTERMINAL_ID: ${terminalId || 'unassigned'}\nVENDOR_API_CONFIGURED: ${vendorConfigured}\nRECENT_TX: ${JSON.stringify((recentTransactions || []).slice(0, 30))}\nPROBLEM: ${problem || 'n/a'}\nReturn JSON {"steps":[""],"warnings":[""],"requires_vendor_call":false,"estimated_minutes":0}`,
      maxTokens: 1200,
      temperature: 0.3,
    });

    return NextResponse.json({ type: 'pos-hardware', vendor_configured: vendorConfigured, result: parseJSON(content) || { raw: content } });
  } catch (e: any) {
    console.error('pos-hardware error:', e.message);
    return NextResponse.json({ error: e.message || 'internal error' }, { status: 500 });
  }
}

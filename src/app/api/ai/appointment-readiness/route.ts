import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { requestAppointmentReadiness } from '@/lib/openrouter';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({})) as { appointmentSummary?: unknown };
    const appointmentSummary = typeof body.appointmentSummary === 'string' ? body.appointmentSummary.trim() : '';
    if (appointmentSummary.length < 10 || appointmentSummary.length > 1000) {
      return NextResponse.json({ error: 'appointmentSummary must contain 10-1000 characters' }, { status: 400 });
    }
    const evidence = await requestAppointmentReadiness(appointmentSummary);
    const result = await prisma.aiResult.create({
      data: {
        feature: 'APPOINTMENT_READINESS',
        salonId: session.user.salonId,
        userId: session.user.id,
        model: evidence.providerReceipt.model,
        input: { appointmentSummary },
        output: { result: evidence.result, providerReceipt: evidence.providerReceipt },
      },
      select: { id: true, createdAt: true },
    });
    return NextResponse.json({
      analysisId: result.id,
      createdAt: result.createdAt,
      ...evidence,
    });
  } catch (error) {
    console.error('Appointment readiness error:', error);
    return NextResponse.json({ error: 'AI provider request failed' }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authorizeAppointment, requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { refundPayment } from '@/lib/field-service/workflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const key = requireIdempotencyKey(request.headers);
    const { appointment, user } = await authorizeAppointment(id, request.headers, { roles: ['OWNER', 'MANAGER'] });
    const body = await request.json();
    const evidence = await callFieldProvider('PAYMENT_REFUND', { sourceRef: appointment.appointmentNumber, idempotencyKey: `refund:${key}`, payload: { appointmentId: appointment.id, amountCents: body.amountCents, reason: body.reason } });
    const refund = await refundPayment({ appointmentId: id, amountCents: body.amountCents, reason: body.reason, evidence, idempotencyKey: key, actor: user! });
    return NextResponse.json({ refund });
  } catch (error) {
    return routeError(error);
  }
}

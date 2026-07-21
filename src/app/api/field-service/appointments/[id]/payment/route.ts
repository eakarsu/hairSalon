import { NextRequest, NextResponse } from 'next/server';
import { authorizeAppointment, requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { applyPaymentEvidence } from '@/lib/field-service/workflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const key = requireIdempotencyKey(request.headers);
    const { appointment, user, actorRole } = await authorizeAppointment(id, request.headers, { customerAllowed: true, roles: ['OWNER', 'MANAGER', 'FRONTDESK'] });
    const body = await request.json();
    const operation = body.capture === false ? 'PAYMENT_AUTHORIZE' : 'PAYMENT_CAPTURE';
    const evidence = await callFieldProvider(operation, { sourceRef: appointment.appointmentNumber, idempotencyKey: `payment:${key}`, payload: { salonId: appointment.salonId, appointmentId: appointment.id, amountCents: body.amountCents || appointment.totalCents, currency: appointment.currency, paymentMethodToken: body.paymentMethodToken } });
    const payment = await applyPaymentEvidence({ appointmentId: id, evidence, idempotencyKey: key, actor: user || undefined, direction: 'OUTBOUND' });
    return NextResponse.json({ payment, actorRole });
  } catch (error) {
    return routeError(error);
  }
}

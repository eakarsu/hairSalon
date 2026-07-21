import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveUser, requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { refundPayment } from '@/lib/field-service/workflow';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser(['OWNER', 'MANAGER']);
    const key = requireIdempotencyKey(request.headers);

    const { id } = await params;
    const body = await request.json();
    const { amount, reason } = body;

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        salonId: user.salonId,
      },
      include: { appointment: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (!payment.appointment) return NextResponse.json({ error: 'Payment is not attached to an appointment' }, { status: 409 });
    const amountCents = amount ? Math.round(Number(amount) * 100) : payment.capturedCents - payment.refundedCents;
    const refundReason = String(reason || 'Manager-approved refund');
    const evidence = await callFieldProvider('PAYMENT_REFUND', { sourceRef: payment.appointment.appointmentNumber, idempotencyKey: `refund:${key}`, payload: { appointmentId: payment.appointment.id, providerPaymentId: payment.providerPaymentId, amountCents, reason: refundReason } });
    const refund = await refundPayment({ appointmentId: payment.appointment.id, amountCents, reason: refundReason, evidence, idempotencyKey: key, actor: user });
    return NextResponse.json({ refund });
  } catch (error) {
    return routeError(error);
  }
}

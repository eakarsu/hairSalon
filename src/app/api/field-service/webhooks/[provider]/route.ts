import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { routeError } from '@/lib/route-error';
import { validateProviderEvidence, verifyFieldWebhook } from '@/lib/field-service/provider';
import { applyPaymentEvidence, refundPayment, WorkflowError } from '@/lib/field-service/workflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await params;
    const raw = Buffer.from(await request.arrayBuffer());
    if (!verifyFieldWebhook(raw, request.headers.get('x-field-signature'))) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }
    const payload = JSON.parse(raw.toString('utf8'));
    if (payload.provider !== provider || !payload.appointmentId) throw new WorkflowError('Webhook identity is invalid', 400);
    const appointment = await prisma.appointment.findUnique({ where: { id: payload.appointmentId } });
    if (!appointment) throw new WorkflowError('Appointment not found', 404);
    const evidence = validateProviderEvidence(payload, { operation: payload.operation, sourceRef: appointment.appointmentNumber });
    const key = `webhook:${provider}:${evidence.eventId}`;
    if (['PAYMENT_AUTHORIZE', 'PAYMENT_CAPTURE'].includes(evidence.operation)) {
      await applyPaymentEvidence({ appointmentId: appointment.id, evidence, idempotencyKey: key, direction: 'INBOUND_WEBHOOK' });
    } else if (evidence.operation === 'PAYMENT_REFUND') {
      await refundPayment({ appointmentId: appointment.id, evidence, amountCents: Number(evidence.result.amountCents), reason: String(evidence.result.reason || 'Provider refund'), idempotencyKey: key, actorRole: 'PROVIDER', direction: 'INBOUND_WEBHOOK' });
    } else {
      throw new WorkflowError('Webhook operation is unsupported', 400);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return routeError(error);
  }
}

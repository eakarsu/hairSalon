import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { authorizeAppointment, requireActiveUser, requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { applyPaymentEvidence, recordTenderPayment } from '@/lib/field-service/workflow';

export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveUser(['OWNER', 'MANAGER', 'FRONTDESK']);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const period = searchParams.get('period') || 'today';

    let startDate: Date;
    const endDate = endOfDay(new Date());

    switch (period) {
      case 'today':
        startDate = startOfDay(new Date());
        break;
      case 'week':
        startDate = startOfDay(subDays(new Date(), 7));
        break;
      case 'month':
        startDate = startOfDay(subDays(new Date(), 30));
        break;
      default:
        startDate = startOfDay(new Date());
    }

    const where: Record<string, unknown> = {
      salonId: user.salonId,
      createdAt: { gte: startDate, lte: endDate },
    };

    if (status) {
      where.status = status;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        appointment: {
          select: {
            id: true,
            startTime: true,
            service: { select: { name: true } },
            technician: { select: { name: true } },
          },
        },
        giftCard: { select: { code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const completed = payments.filter((p) => ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(p.status));
    const net = (payment: typeof completed[number]) => (payment.capturedCents - payment.refundedCents) / 100;
    const totalRevenue = completed.reduce((sum, p) => sum + net(p), 0);
    const cashPayments = completed.filter((p) => p.method === 'CASH').reduce((sum, p) => sum + net(p), 0);
    const cardPayments = completed.filter((p) => p.method === 'CARD').reduce((sum, p) => sum + net(p), 0);
    const giftCardPayments = completed.filter((p) => p.method === 'GIFT_CARD').reduce((sum, p) => sum + net(p), 0);

    return NextResponse.json({
      payments,
      summary: {
        totalRevenue,
        transactionCount: completed.length,
        cash: cashPayments,
        card: cardPayments,
        giftCard: giftCardPayments,
        pending: payments.filter((p) => p.status === 'PENDING').length,
        failed: payments.filter((p) => p.status === 'FAILED').length,
      },
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser(['OWNER', 'MANAGER', 'FRONTDESK']);
    const key = requireIdempotencyKey(request.headers);
    const body = await request.json();
    const { appointmentId, amount, method, giftCardId, notes, paymentMethodToken } = body;

    if (!appointmentId || !amount || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { appointment } = await authorizeAppointment(appointmentId, request.headers, { roles: ['OWNER', 'MANAGER', 'FRONTDESK'] });
    const amountCents = Math.round(Number(amount) * 100);
    if (method === 'CARD') {
      const evidence = await callFieldProvider('PAYMENT_CAPTURE', { sourceRef: appointment.appointmentNumber, idempotencyKey: `payment:${key}`, payload: { appointmentId, amountCents, currency: appointment.currency, paymentMethodToken } });
      return NextResponse.json({ payment: await applyPaymentEvidence({ appointmentId, evidence, idempotencyKey: key, actor: user }) });
    }
    if (!['CASH', 'GIFT_CARD'].includes(method)) return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });
    const payment = await recordTenderPayment({ appointmentId, amountCents, method, giftCardId, notes, idempotencyKey: key, actor: user });
    return NextResponse.json({ payment });
  } catch (error) {
    return routeError(error);
  }
}

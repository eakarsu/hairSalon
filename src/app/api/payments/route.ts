import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      salonId: session.user.salonId,
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
    const completed = payments.filter((p) => p.status === 'COMPLETED');
    const totalRevenue = completed.reduce((sum, p) => sum + p.amount, 0);
    const cashPayments = completed.filter((p) => p.method === 'CASH').reduce((sum, p) => sum + p.amount, 0);
    const cardPayments = completed.filter((p) => p.method === 'CARD').reduce((sum, p) => sum + p.amount, 0);
    const giftCardPayments = completed.filter((p) => p.method === 'GIFT_CARD').reduce((sum, p) => sum + p.amount, 0);

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
    console.error('Payments fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, clientId, amount, method, giftCardId, notes } = body;

    if (!clientId || !amount || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Handle gift card payment
    let finalGiftCardId = giftCardId;
    if (method === 'GIFT_CARD' && giftCardId) {
      const giftCard = await prisma.giftCard.findUnique({
        where: { id: giftCardId },
      });

      if (!giftCard || giftCard.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Invalid or inactive gift card' }, { status: 400 });
      }

      if (giftCard.balance < amount) {
        return NextResponse.json({ error: 'Insufficient gift card balance' }, { status: 400 });
      }

      // Deduct from gift card
      const newBalance = giftCard.balance - amount;
      await prisma.giftCard.update({
        where: { id: giftCardId },
        data: {
          balance: newBalance,
          status: newBalance <= 0 ? 'USED' : 'ACTIVE',
        },
      });
    }

    const payment = await prisma.payment.create({
      data: {
        salonId: session.user.salonId,
        appointmentId: appointmentId || null,
        clientId,
        amount: parseFloat(amount),
        method,
        status: 'COMPLETED',
        giftCardId: finalGiftCardId || null,
        notes: notes || null,
      },
      include: {
        client: { select: { id: true, name: true } },
        appointment: {
          select: {
            service: { select: { name: true } },
          },
        },
      },
    });

    // If this payment is for an appointment, mark it as completed
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'COMPLETED' },
      });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Payment create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { stripeClient } from '@/lib/stripe';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { amount } = body; // Optional: for partial refunds

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Can only refund completed payments' }, { status: 400 });
    }

    // If payment was made with Stripe
    if (payment.stripeId) {
      const result = await stripeClient.refundPayment(payment.stripeId, amount);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
    }

    // If payment was made with gift card, restore the balance
    if (payment.method === 'GIFT_CARD' && payment.giftCardId) {
      const refundAmount = amount || payment.amount;

      await prisma.giftCard.update({
        where: { id: payment.giftCardId },
        data: {
          balance: { increment: refundAmount },
          status: 'ACTIVE',
        },
      });
    }

    // Update payment status
    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        notes: payment.notes
          ? `${payment.notes}\n[Refunded ${amount ? `$${amount}` : 'full amount'}]`
          : `[Refunded ${amount ? `$${amount}` : 'full amount'}]`,
      },
    });

    return NextResponse.json({ payment: updated });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

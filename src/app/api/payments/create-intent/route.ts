import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripeClient } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, clientId, appointmentId, description } = body;

    if (!amount || !clientId) {
      return NextResponse.json({ error: 'Amount and client ID required' }, { status: 400 });
    }

    const result = await stripeClient.createPaymentIntent({
      amount: parseFloat(amount),
      clientId,
      appointmentId,
      description,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      publishableKey: stripeClient.getPublishableKey(),
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

export async function POST(request: NextRequest) {
  try {
    const { salonId, appointmentId, amount, clientEmail, clientName } = await request.json();

    if (!salonId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get salon for booking settings
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    // Get booking settings
    const bookingSettings = await prisma.bookingSettings.findUnique({
      where: { salonId },
    });

    // If Stripe is configured, create real payment intent
    if (stripe) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          salonId,
          appointmentId: appointmentId || '',
          clientEmail: clientEmail || '',
          clientName: clientName || '',
        },
        receipt_email: clientEmail,
        description: `Booking deposit at ${salon.name}`,
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
        requiresDeposit: bookingSettings?.requireDeposit || false,
        depositAmount: bookingSettings?.depositAmount || amount,
      });
    }

    // Simulation mode for development
    const simulatedPaymentId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      clientSecret: `${simulatedPaymentId}_secret`,
      paymentIntentId: simulatedPaymentId,
      amount,
      requiresDeposit: bookingSettings?.requireDeposit || false,
      depositAmount: bookingSettings?.depositAmount || amount,
      simulated: true,
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

// Confirm payment (webhook simulation or direct confirmation)
export async function PUT(request: NextRequest) {
  try {
    const { paymentIntentId, appointmentId, salonId, clientId, amount } = await request.json();

    if (!paymentIntentId || !appointmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify payment with Stripe if configured
    if (stripe && !paymentIntentId.startsWith('sim_')) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
      }
    }

    // Update appointment with deposit info
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        depositPaid: true,
        depositAmount: amount,
        status: 'CONFIRMED',
      },
    });

    // Create payment record
    if (clientId && salonId) {
      await prisma.payment.create({
        data: {
          salonId,
          appointmentId,
          clientId,
          amount,
          method: 'CARD',
          status: 'COMPLETED',
          stripeId: paymentIntentId,
          notes: 'Online booking deposit',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed and appointment updated',
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}

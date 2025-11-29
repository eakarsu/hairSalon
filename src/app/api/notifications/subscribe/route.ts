import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { salonId, userId, subscription } = await request.json();

    if (!salonId || !subscription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Store the push subscription
    await prisma.notificationSubscription.upsert({
      where: {
        id: subscription.endpoint, // Using endpoint as unique identifier
      },
      create: {
        id: subscription.endpoint.split('/').pop() || subscription.endpoint,
        salonId,
        userId,
        endpoint: subscription.endpoint,
        type: 'PUSH',
        active: true,
        metadata: {
          keys: subscription.keys,
          expirationTime: subscription.expirationTime,
        },
      },
      update: {
        active: true,
        metadata: {
          keys: subscription.keys,
          expirationTime: subscription.expirationTime,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscribe to notifications error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

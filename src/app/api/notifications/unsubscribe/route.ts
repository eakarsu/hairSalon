import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    // Deactivate the subscription
    await prisma.notificationSubscription.updateMany({
      where: { endpoint },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe from notifications error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Gift card code required' }, { status: 400 });
    }

    const giftCard = await prisma.giftCard.findUnique({
      where: { code: code.toUpperCase().replace(/[^A-Z0-9]/g, '') },
      select: {
        id: true,
        code: true,
        balance: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!giftCard) {
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    // Check expiration
    if (giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date()) {
      return NextResponse.json({
        giftCard: {
          ...giftCard,
          status: 'EXPIRED',
          balance: 0,
        },
      });
    }

    return NextResponse.json({ giftCard });
  } catch (error) {
    console.error('Gift card lookup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

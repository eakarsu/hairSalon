import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const code = searchParams.get('code');

    const where: Record<string, unknown> = {
      salonId: session.user.salonId,
    };

    if (status) {
      where.status = status;
    }

    if (code) {
      where.code = { contains: code.toUpperCase() };
    }

    const giftCards = await prisma.giftCard.findMany({
      where,
      include: {
        recipient: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ giftCards });
  } catch (error) {
    console.error('Gift cards fetch error:', error);
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
    const { initialValue, purchasedBy, recipientId, expiresAt } = body;

    if (!initialValue || initialValue <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
    }

    // Generate unique code
    let code = generateGiftCardCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.giftCard.findUnique({ where: { code } });
      if (!existing) break;
      code = generateGiftCardCode();
      attempts++;
    }

    const giftCard = await prisma.giftCard.create({
      data: {
        salonId: session.user.salonId,
        code,
        initialValue,
        balance: initialValue,
        purchasedBy: purchasedBy || null,
        recipientId: recipientId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'ACTIVE',
      },
      include: {
        recipient: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({ giftCard });
  } catch (error) {
    console.error('Gift card create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

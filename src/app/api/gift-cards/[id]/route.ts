import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const giftCard = await prisma.giftCard.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
      include: {
        recipient: { select: { id: true, name: true, phone: true } },
        payments: {
          select: { id: true, amount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!giftCard) {
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    return NextResponse.json({ giftCard });
  } catch (error) {
    console.error('Gift card fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
    const { status, recipientId } = body;

    const giftCard = await prisma.giftCard.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!giftCard) {
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    const updated = await prisma.giftCard.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(recipientId !== undefined && { recipientId }),
      },
      include: {
        recipient: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({ giftCard: updated });
  } catch (error) {
    console.error('Gift card update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

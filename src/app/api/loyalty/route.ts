import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await prisma.loyaltyAccount.findMany({
      where: { salonId: session.user.salonId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            preferredLanguage: true,
          },
        },
        transactions: {
          select: {
            points: true,
            type: true,
          },
        },
      },
      orderBy: { pointsBalance: 'desc' },
    });

    return NextResponse.json({
      accounts: accounts.map((a) => {
        const totalEarned = a.transactions
          .filter(t => t.type === 'EARN')
          .reduce((sum, t) => sum + t.points, 0);
        const totalRedeemed = a.transactions
          .filter(t => t.type === 'REDEEM')
          .reduce((sum, t) => sum + t.points, 0);
        return {
          id: a.id,
          clientId: a.client.id,
          clientName: a.client.name,
          clientPhone: a.client.phone,
          clientLanguage: a.client.preferredLanguage,
          pointsBalance: a.pointsBalance,
          tier: a.tier,
          totalEarned,
          totalRedeemed,
          lastActivity: a.updatedAt,
        };
      }),
    });
  } catch (error) {
    console.error('Loyalty fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch loyalty accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, initialPoints } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Check if account already exists
    const existing = await prisma.loyaltyAccount.findFirst({
      where: { clientId, salonId: session.user.salonId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Loyalty account already exists for this client' }, { status: 400 });
    }

    const account = await prisma.loyaltyAccount.create({
      data: {
        salonId: session.user.salonId,
        clientId,
        pointsBalance: initialPoints || 0,
        tier: 'BRONZE',
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error('Loyalty create error:', error);
    return NextResponse.json({ error: 'Failed to create loyalty account' }, { status: 500 });
  }
}

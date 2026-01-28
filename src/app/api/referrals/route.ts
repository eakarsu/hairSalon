import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { salonId: session.user.salonId };
    if (status) where.status = status;

    const referrals = await prisma.referral.findMany({
      where,
      include: {
        referrer: { select: { id: true, name: true, phone: true, email: true } },
        referred: { select: { id: true, name: true, phone: true, email: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary stats
    const summary = {
      total: referrals.length,
      pending: referrals.filter(r => r.status === 'PENDING').length,
      qualified: referrals.filter(r => r.status === 'QUALIFIED').length,
      rewarded: referrals.filter(r => r.status === 'REWARDED').length,
      totalRewardsGiven: referrals
        .filter(r => r.status === 'REWARDED' && r.rewardValue)
        .reduce((sum, r) => sum + (r.rewardValue || 0), 0),
    };

    // Top referrers
    const referrerCounts = referrals.reduce((acc, r) => {
      acc[r.referrerId] = (acc[r.referrerId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topReferrers = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        client: referrals.find(r => r.referrerId === id)?.referrer,
        count,
      }));

    return NextResponse.json({ referrals, summary, topReferrers });
  } catch (error) {
    console.error('Failed to fetch referrals:', error);
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { referrerId, referredId, rewardType, rewardValue } = body;

    // Check if referred client already has a referral
    const existing = await prisma.referral.findUnique({
      where: { referredId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Client already has a referrer' }, { status: 400 });
    }

    const referral = await prisma.referral.create({
      data: {
        salonId: session.user.salonId,
        referrerId,
        referredId,
        rewardType: rewardType || 'points',
        rewardValue: rewardValue || 100,
        status: 'PENDING',
      },
      include: {
        referrer: { select: { id: true, name: true } },
        referred: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ referral });
  } catch (error) {
    console.error('Failed to create referral:', error);
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, action } = body;

    // Qualify referral when referred client makes first purchase
    if (action === 'qualify') {
      const referral = await prisma.referral.update({
        where: { id, salonId: session.user.salonId },
        data: { status: 'QUALIFIED' },
        include: {
          referrer: { select: { id: true, name: true } },
          referred: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json({ referral });
    }

    // Give reward to referrer
    if (action === 'reward') {
      const referral = await prisma.referral.findUnique({
        where: { id },
        include: { referrer: true },
      });

      if (!referral) {
        return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
      }

      // If reward type is points, add to loyalty account
      if (referral.rewardType === 'points') {
        const loyaltyAccount = await prisma.loyaltyAccount.findUnique({
          where: { clientId: referral.referrerId },
        });

        if (loyaltyAccount) {
          await prisma.$transaction([
            prisma.loyaltyAccount.update({
              where: { id: loyaltyAccount.id },
              data: { pointsBalance: { increment: referral.rewardValue || 0 } },
            }),
            prisma.loyaltyTransaction.create({
              data: {
                loyaltyAccountId: loyaltyAccount.id,
                type: 'EARN',
                points: referral.rewardValue || 0,
                description: 'Referral reward',
              },
            }),
          ]);
        }
      }

      const updated = await prisma.referral.update({
        where: { id, salonId: session.user.salonId },
        data: {
          status: 'REWARDED',
          rewardGivenAt: new Date(),
        },
        include: {
          referrer: { select: { id: true, name: true } },
          referred: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json({ referral: updated });
    }

    // Generic status update
    const referral = await prisma.referral.update({
      where: { id, salonId: session.user.salonId },
      data: { status },
    });

    return NextResponse.json({ referral });
  } catch (error) {
    console.error('Failed to update referral:', error);
    return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 });
  }
}

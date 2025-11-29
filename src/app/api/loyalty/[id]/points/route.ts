import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const { action, points, description } = body;

    if (!action || !points || points <= 0) {
      return NextResponse.json({ error: 'Action and positive points amount required' }, { status: 400 });
    }

    // Verify the loyalty account exists and belongs to this salon
    const account = await prisma.loyaltyAccount.findFirst({
      where: { id, salonId: session.user.salonId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Loyalty account not found' }, { status: 404 });
    }

    // For redemption, check if they have enough points
    if (action === 'redeem' && account.pointsBalance < points) {
      return NextResponse.json({ error: 'Insufficient points balance' }, { status: 400 });
    }

    // Calculate new balance
    const newBalance = action === 'add'
      ? account.pointsBalance + points
      : account.pointsBalance - points;

    // Determine new tier based on total earned (for add) or keep current for redeem
    let newTier = account.tier;
    if (action === 'add') {
      if (newBalance >= 2000) newTier = 'PLATINUM';
      else if (newBalance >= 1000) newTier = 'GOLD';
      else if (newBalance >= 500) newTier = 'SILVER';
      else newTier = 'BRONZE';
    }

    // Update account and create transaction in a transaction
    const [updatedAccount] = await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id },
        data: {
          pointsBalance: newBalance,
          tier: newTier,
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: id,
          type: action === 'add' ? 'EARN' : 'REDEEM',
          points,
          description: description || (action === 'add' ? 'Points added' : 'Points redeemed'),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      account: updatedAccount,
      newBalance,
      newTier,
    });
  } catch (error) {
    console.error('Loyalty points error:', error);
    return NextResponse.json({ error: 'Failed to update points' }, { status: 500 });
  }
}

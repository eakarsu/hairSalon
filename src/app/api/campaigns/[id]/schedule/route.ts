import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/campaigns/[id]/schedule
 * Body: { scheduledAt: string (ISO date) }
 * Sets the scheduledAt field on the campaign so the cron job can pick it up.
 */
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
    const { scheduledAt } = body;

    if (!scheduledAt) {
      return NextResponse.json({ error: 'scheduledAt is required' }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 });
    }

    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'scheduledAt must be in the future' },
        { status: 400 }
      );
    }

    // Verify campaign belongs to this salon
    const existing = await prisma.campaign.findFirst({
      where: { id, salonId: session.user.salonId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (existing.sentAt) {
      return NextResponse.json(
        { error: 'Campaign has already been sent and cannot be rescheduled' },
        { status: 409 }
      );
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        scheduledAt: scheduledDate,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Campaign schedule error:', error);
    return NextResponse.json({ error: 'Failed to schedule campaign' }, { status: 500 });
  }
}

/**
 * DELETE /api/campaigns/[id]/schedule
 * Clears the scheduledAt field, effectively cancelling the scheduled send.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.campaign.findFirst({
      where: { id, salonId: session.user.salonId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (existing.sentAt) {
      return NextResponse.json(
        { error: 'Campaign has already been sent' },
        { status: 409 }
      );
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: { scheduledAt: null },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Campaign unschedule error:', error);
    return NextResponse.json({ error: 'Failed to unschedule campaign' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/cron/send-campaigns
 *
 * Intended to be called by a cron scheduler (Vercel Cron, cron-job.org, etc.)
 * every 5–15 minutes.
 *
 * Finds all campaigns where:
 *   - scheduledAt <= now
 *   - sentAt IS NULL  (not yet sent)
 *   - status = ACTIVE
 *
 * Marks each as sent by setting sentAt = now and status = COMPLETED,
 * then marks all pending CampaignMessages for that campaign as SENT.
 *
 * Protect with a shared secret via the CRON_SECRET env variable.
 */
export async function GET(request: NextRequest) {
  // Validate cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (token !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date();

    // Find campaigns ready to send
    const dueCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        scheduledAt: { lte: now },
        sentAt: null,
      },
      include: {
        _count: { select: { messages: true } },
      },
    });

    if (dueCampaigns.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No campaigns due' });
    }

    const results: Array<{ id: string; name: string; messagesMarked: number }> = [];

    for (const campaign of dueCampaigns) {
      // Mark pending messages as sent
      const { count: messagesMarked } = await prisma.campaignMessage.updateMany({
        where: {
          campaignId: campaign.id,
          status: 'PENDING',
        },
        data: {
          status: 'SENT',
          sentAt: now,
        },
      });

      // Mark campaign itself as sent
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          sentAt: now,
          status: 'COMPLETED',
        },
      });

      results.push({
        id: campaign.id,
        name: campaign.name,
        messagesMarked,
      });

      console.log(
        `[cron/send-campaigns] Campaign "${campaign.name}" (${campaign.id}) sent. Messages marked: ${messagesMarked}`
      );
    }

    return NextResponse.json({
      sent: results.length,
      campaigns: results,
    });
  } catch (error) {
    console.error('[cron/send-campaigns] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

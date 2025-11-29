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

    const campaigns = await prisma.campaign.findMany({
      where: { salonId: session.user.salonId },
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      campaigns: campaigns.map((c) => {
        const audienceData = c.audienceQuery as { channel?: string; targetAudience?: string; messageTemplate?: string } | null;
        return {
          id: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          channel: audienceData?.channel || 'SMS',
          targetAudience: audienceData?.targetAudience || 'ALL',
          messageTemplate: audienceData?.messageTemplate || '',
          totalMessages: c._count.messages,
          createdAt: c.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error('Campaigns fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, channel, messageTemplate, targetAudience } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        salonId: session.user.salonId,
        name,
        type,
        status: 'ACTIVE',
        audienceQuery: {
          channel: channel || 'SMS',
          messageTemplate: messageTemplate || '',
          targetAudience: targetAudience || 'ALL',
        },
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Campaign create error:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}

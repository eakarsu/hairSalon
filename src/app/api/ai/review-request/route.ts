import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import openRouterClient from '@/lib/openRouterClient';
import prisma from '@/lib/prisma';
import { AIContextType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { serviceName, visitDate, platform, language, clientId } = body;

    if (!serviceName || !visitDate || !platform || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: serviceName, visitDate, platform, language' },
        { status: 400 }
      );
    }

    if (!['Google', 'Yelp'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be "Google" or "Yelp"' },
        { status: 400 }
      );
    }

    const message = await openRouterClient.generateReviewRequest({
      serviceName,
      visitDate,
      platform,
      language,
    });

    // Log to AI audit
    await prisma.aIAuditLog.create({
      data: {
        salonId: session.user.salonId,
        clientId: clientId || null,
        contextType: AIContextType.REVIEW,
        inputSummary: `Review request for ${serviceName} on ${visitDate} for ${platform} in ${language}`,
        outputSummary: message.substring(0, 500),
      },
    });

    return NextResponse.json({ message, platform, language });
  } catch (error) {
    console.error('Review request error:', error);
    return NextResponse.json(
      { error: 'Failed to generate review request' },
      { status: 500 }
    );
  }
}

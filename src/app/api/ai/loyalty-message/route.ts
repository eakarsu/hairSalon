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
    const { clientName, pointsBalance, tier, offers, language, clientId } = body;

    if (!clientName || pointsBalance === undefined || !tier || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: clientName, pointsBalance, tier, language' },
        { status: 400 }
      );
    }

    const message = await openRouterClient.generateLoyaltyMessage({
      clientName,
      pointsBalance,
      tier,
      offers: offers || [],
      language,
    });

    // Log to AI audit
    await prisma.aIAuditLog.create({
      data: {
        salonId: session.user.salonId,
        clientId: clientId || null,
        contextType: AIContextType.LOYALTY,
        inputSummary: `Loyalty message for ${clientName} - ${tier} tier, ${pointsBalance} pts in ${language}`,
        outputSummary: message.substring(0, 500),
      },
    });

    return NextResponse.json({ message, language });
  } catch (error) {
    console.error('Loyalty message error:', error);
    return NextResponse.json(
      { error: 'Failed to generate loyalty message' },
      { status: 500 }
    );
  }
}

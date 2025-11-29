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
    const { clientName, serviceName, dateTime, salonName, language, clientId } = body;

    if (!clientName || !serviceName || !dateTime || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: clientName, serviceName, dateTime, language' },
        { status: 400 }
      );
    }

    const reminder = await openRouterClient.generateMultilangReminder({
      clientName,
      serviceName,
      dateTime,
      salonName: salonName || 'our salon',
      language,
    });

    // Log to AI audit
    await prisma.aIAuditLog.create({
      data: {
        salonId: session.user.salonId,
        clientId: clientId || null,
        contextType: AIContextType.REMINDER,
        inputSummary: `Reminder for ${clientName} - ${serviceName} at ${dateTime} in ${language}`,
        outputSummary: reminder.substring(0, 500),
      },
    });

    return NextResponse.json({ reminder, language });
  } catch (error) {
    console.error('Multilang reminder error:', error);
    return NextResponse.json(
      { error: 'Failed to generate reminder' },
      { status: 500 }
    );
  }
}

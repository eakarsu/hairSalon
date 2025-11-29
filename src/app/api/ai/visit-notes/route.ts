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
    const { bulletNotes, visitId, clientId } = body;

    if (!bulletNotes) {
      return NextResponse.json(
        { error: 'Missing required field: bulletNotes' },
        { status: 400 }
      );
    }

    const summary = await openRouterClient.summarizeVisitNotes({
      bulletNotes,
    });

    // Update visit if visitId provided
    if (visitId) {
      await prisma.visit.update({
        where: { id: visitId },
        data: { designDescription: summary },
      });
    }

    // Log to AI audit
    await prisma.aIAuditLog.create({
      data: {
        salonId: session.user.salonId,
        clientId: clientId || null,
        contextType: AIContextType.VISIT_NOTES,
        inputSummary: `Visit notes summary: ${bulletNotes.substring(0, 200)}...`,
        outputSummary: summary.substring(0, 500),
      },
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Visit notes error:', error);
    return NextResponse.json(
      { error: 'Failed to summarize visit notes' },
      { status: 500 }
    );
  }
}

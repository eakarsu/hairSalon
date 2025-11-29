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
    const {
      noShowRate,
      repeatVisitRate,
      loyaltyUsageRate,
      campaignOpenRate,
      averageTicket,
      totalAppointments,
    } = body;

    if (
      noShowRate === undefined ||
      repeatVisitRate === undefined ||
      loyaltyUsageRate === undefined ||
      campaignOpenRate === undefined ||
      averageTicket === undefined ||
      totalAppointments === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required KPI fields' },
        { status: 400 }
      );
    }

    const insights = await openRouterClient.generateKPIInsights({
      noShowRate,
      repeatVisitRate,
      loyaltyUsageRate,
      campaignOpenRate,
      averageTicket,
      totalAppointments,
    });

    // Log to AI audit
    await prisma.aIAuditLog.create({
      data: {
        salonId: session.user.salonId,
        contextType: AIContextType.KPI,
        inputSummary: `KPI Analysis - NoShow: ${(noShowRate * 100).toFixed(1)}%, Repeat: ${(repeatVisitRate * 100).toFixed(1)}%, Loyalty: ${(loyaltyUsageRate * 100).toFixed(1)}%`,
        outputSummary: insights.substring(0, 500),
      },
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('KPI insights error:', error);
    return NextResponse.json(
      { error: 'Failed to generate KPI insights' },
      { status: 500 }
    );
  }
}

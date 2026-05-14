import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { startOfMonth, endOfMonth } from 'date-fns';

// Rough cost estimates per 1K tokens (using gpt-4o-mini equivalent pricing as default)
const COST_PER_CALL_USD = 0.002;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only OWNER or MANAGER can view AI audit logs
    if (!['OWNER', 'MANAGER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
    const contextType = searchParams.get('contextType') || undefined;

    const where = {
      salonId: session.user.salonId,
      ...(contextType ? { contextType: contextType as never } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.aIAuditLog.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.aIAuditLog.count({ where }),
    ]);

    // Monthly stats
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthlyCount = await prisma.aIAuditLog.count({
      where: {
        salonId: session.user.salonId,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    });

    const estimatedCostUsd = monthlyCount * COST_PER_CALL_USD;

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        contextType: log.contextType,
        clientId: log.clientId,
        clientName: log.client?.name ?? null,
        inputPreview: log.inputSummary.slice(0, 200),
        outputPreview: log.outputSummary.slice(0, 200),
        estimatedCostUsd: COST_PER_CALL_USD,
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      monthlyStats: {
        totalCalls: monthlyCount,
        estimatedCostUsd: Math.round(estimatedCostUsd * 100) / 100,
        month: now.toISOString().slice(0, 7),
      },
    });
  } catch (error) {
    console.error('AI audit log fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

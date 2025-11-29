import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get('technicianId');
    const period = searchParams.get('period') || 'today';

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
    }

    const where: Record<string, unknown> = {
      salonId: session.user.salonId,
      createdAt: { gte: startDate, lte: endDate },
    };

    if (technicianId) {
      where.technicianId = technicianId;
    }

    const tips = await prisma.tip.findMany({
      where,
      include: {
        technician: { select: { id: true, name: true } },
        appointment: {
          select: {
            id: true,
            startTime: true,
            service: { select: { name: true } },
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary by technician
    const summaryByTechnician: Record<string, { name: string; total: number; count: number; cash: number; card: number }> = {};

    tips.forEach((tip) => {
      const techId = tip.technicianId;
      if (!summaryByTechnician[techId]) {
        summaryByTechnician[techId] = {
          name: tip.technician.name,
          total: 0,
          count: 0,
          cash: 0,
          card: 0,
        };
      }
      summaryByTechnician[techId].total += tip.amount;
      summaryByTechnician[techId].count += 1;
      if (tip.method === 'CASH') {
        summaryByTechnician[techId].cash += tip.amount;
      } else if (tip.method === 'CARD') {
        summaryByTechnician[techId].card += tip.amount;
      }
    });

    const totalTips = tips.reduce((sum, t) => sum + t.amount, 0);
    const cashTips = tips.filter((t) => t.method === 'CASH').reduce((sum, t) => sum + t.amount, 0);
    const cardTips = tips.filter((t) => t.method === 'CARD').reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      tips,
      summary: {
        total: totalTips,
        cash: cashTips,
        card: cardTips,
        count: tips.length,
        byTechnician: Object.values(summaryByTechnician).sort((a, b) => b.total - a.total),
      },
    });
  } catch (error) {
    console.error('Tips fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, technicianId, amount, method } = body;

    if (!appointmentId || !technicianId || !amount || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if tip already exists for this appointment
    const existingTip = await prisma.tip.findUnique({
      where: { appointmentId },
    });

    if (existingTip) {
      return NextResponse.json({ error: 'Tip already recorded for this appointment' }, { status: 400 });
    }

    const tip = await prisma.tip.create({
      data: {
        salonId: session.user.salonId,
        appointmentId,
        technicianId,
        amount: parseFloat(amount),
        method,
      },
      include: {
        technician: { select: { id: true, name: true } },
        appointment: {
          select: {
            service: { select: { name: true } },
            client: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ tip });
  } catch (error) {
    console.error('Tips create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

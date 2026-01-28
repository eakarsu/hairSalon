import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // e.g., "2024-01"
    const technicianId = searchParams.get('technicianId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { salonId: session.user.salonId };
    if (period) where.period = period;
    if (technicianId) where.technicianId = technicianId;
    if (status) where.status = status;

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        technician: { select: { id: true, name: true, email: true, level: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get commission rules
    const rules = await prisma.commissionRule.findMany({
      where: { salonId: session.user.salonId },
      include: {
        technician: { select: { id: true, name: true } },
      },
    });

    // Calculate summary
    const summary = {
      totalPending: commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.commissionAmount, 0),
      totalApproved: commissions.filter(c => c.status === 'APPROVED').reduce((sum, c) => sum + c.commissionAmount, 0),
      totalPaid: commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.commissionAmount, 0),
    };

    return NextResponse.json({ commissions, rules, summary });
  } catch (error) {
    console.error('Failed to fetch commissions:', error);
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { technicianId, serviceAmount, productAmount, tipAmount, period } = body;

    // Get commission rule for technician
    let rule = await prisma.commissionRule.findUnique({
      where: { technicianId },
    });

    // If no rule, use defaults
    const serviceRate = rule?.serviceRate ?? 0.45;
    const productRate = rule?.productRate ?? 0.10;
    const tipRate = rule?.tipRate ?? 1.0;

    const commissionAmount =
      (serviceAmount || 0) * serviceRate +
      (productAmount || 0) * productRate +
      (tipAmount || 0) * tipRate;

    const commission = await prisma.commission.create({
      data: {
        salonId: session.user.salonId,
        technicianId,
        serviceAmount: serviceAmount || 0,
        productAmount: productAmount || 0,
        tipAmount: tipAmount || 0,
        commissionRate: serviceRate,
        commissionAmount,
        period,
        status: 'PENDING',
      },
      include: {
        technician: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ commission });
  } catch (error) {
    console.error('Failed to create commission:', error);
    return NextResponse.json({ error: 'Failed to create commission' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, status } = body;

    const updated = await prisma.commission.updateMany({
      where: {
        id: { in: ids },
        salonId: session.user.salonId,
      },
      data: {
        status,
        paidAt: status === 'PAID' ? new Date() : undefined,
      },
    });

    return NextResponse.json({ updated: updated.count });
  } catch (error) {
    console.error('Failed to update commissions:', error);
    return NextResponse.json({ error: 'Failed to update commissions' }, { status: 500 });
  }
}

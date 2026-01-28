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
    const type = searchParams.get('type'); // 'plans' or 'members'

    if (type === 'plans' || !type) {
      const plans = await prisma.membershipPlan.findMany({
        where: { salonId: session.user.salonId, active: true },
        include: {
          _count: { select: { memberships: { where: { status: 'ACTIVE' } } } },
        },
        orderBy: { monthlyPrice: 'asc' },
      });
      return NextResponse.json({ plans });
    }

    if (type === 'members') {
      const memberships = await prisma.membership.findMany({
        where: { salonId: session.user.salonId },
        include: {
          plan: { select: { id: true, name: true, monthlyPrice: true, discountPercent: true } },
          client: { select: { id: true, name: true, phone: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const summary = {
        active: memberships.filter(m => m.status === 'ACTIVE').length,
        paused: memberships.filter(m => m.status === 'PAUSED').length,
        cancelled: memberships.filter(m => m.status === 'CANCELLED').length,
        monthlyRevenue: memberships
          .filter(m => m.status === 'ACTIVE')
          .reduce((sum, m) => sum + (m.plan?.monthlyPrice || 0), 0),
      };

      return NextResponse.json({ memberships, summary });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Failed to fetch memberships:', error);
    return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    // Create membership plan
    if (type === 'plan') {
      const { name, description, monthlyPrice, annualPrice, benefits, discountPercent, freeServices } = body;

      const plan = await prisma.membershipPlan.create({
        data: {
          salonId: session.user.salonId,
          name,
          description,
          monthlyPrice,
          annualPrice,
          benefits: benefits || [],
          discountPercent: discountPercent || 0,
          freeServices,
        },
      });

      return NextResponse.json({ plan });
    }

    // Enroll client in membership
    if (type === 'enrollment') {
      const { planId, clientId, billingCycle } = body;

      const plan = await prisma.membershipPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      const membership = await prisma.membership.create({
        data: {
          salonId: session.user.salonId,
          planId,
          clientId,
          billingCycle: billingCycle || 'MONTHLY',
          nextBillDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          servicesUsed: {},
        },
        include: {
          plan: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json({ membership });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Failed to create membership:', error);
    return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, action } = body;

    if (action === 'pause') {
      const membership = await prisma.membership.update({
        where: { id, salonId: session.user.salonId },
        data: { status: 'PAUSED' },
      });
      return NextResponse.json({ membership });
    }

    if (action === 'resume') {
      const membership = await prisma.membership.update({
        where: { id, salonId: session.user.salonId },
        data: { status: 'ACTIVE' },
      });
      return NextResponse.json({ membership });
    }

    if (action === 'cancel') {
      const membership = await prisma.membership.update({
        where: { id, salonId: session.user.salonId },
        data: { status: 'CANCELLED', endDate: new Date() },
      });
      return NextResponse.json({ membership });
    }

    // Generic update
    const membership = await prisma.membership.update({
      where: { id, salonId: session.user.salonId },
      data: { status },
    });

    return NextResponse.json({ membership });
  } catch (error) {
    console.error('Failed to update membership:', error);
    return NextResponse.json({ error: 'Failed to update membership' }, { status: 500 });
  }
}

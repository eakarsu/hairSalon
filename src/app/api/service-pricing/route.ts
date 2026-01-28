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
    const serviceId = searchParams.get('serviceId');

    const where: Record<string, unknown> = { salonId: session.user.salonId };
    if (serviceId) where.serviceId = serviceId;

    const pricings = await prisma.servicePricing.findMany({
      where,
      include: {
        service: { select: { id: true, name: true, basePrice: true, category: true } },
      },
      orderBy: [{ serviceId: 'asc' }, { level: 'asc' }],
    });

    // Group by service
    const byService = pricings.reduce((acc, pricing) => {
      const svcId = pricing.serviceId;
      if (!acc[svcId]) {
        acc[svcId] = {
          service: pricing.service,
          tiers: [],
        };
      }
      acc[svcId].tiers.push({
        id: pricing.id,
        level: pricing.level,
        price: pricing.price,
      });
      return acc;
    }, {} as Record<string, { service: { id: string; name: string; basePrice: number; category: string }; tiers: { id: string; level: string; price: number }[] }>);

    // Get all services to show which ones have pricing tiers
    const services = await prisma.service.findMany({
      where: { salonId: session.user.salonId, active: true },
      select: { id: true, name: true, basePrice: true, category: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ pricings, byService: Object.values(byService), services });
  } catch (error) {
    console.error('Failed to fetch service pricing:', error);
    return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { serviceId, tiers } = body;

    // tiers is an array of { level: 'JUNIOR' | 'SENIOR' | 'MASTER' | 'SPECIALIST', price: number }

    // Delete existing tiers for this service
    await prisma.servicePricing.deleteMany({
      where: { serviceId, salonId: session.user.salonId },
    });

    // Create new tiers
    const created = await prisma.servicePricing.createMany({
      data: tiers.map((t: { level: string; price: number }) => ({
        salonId: session.user.salonId,
        serviceId,
        level: t.level,
        price: t.price,
      })),
    });

    // Fetch the created pricing
    const pricings = await prisma.servicePricing.findMany({
      where: { serviceId, salonId: session.user.salonId },
      include: {
        service: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ pricings, created: created.count });
  } catch (error) {
    console.error('Failed to create service pricing:', error);
    return NextResponse.json({ error: 'Failed to create pricing' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, price } = body;

    const pricing = await prisma.servicePricing.update({
      where: { id, salonId: session.user.salonId },
      data: { price },
      include: {
        service: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ pricing });
  } catch (error) {
    console.error('Failed to update service pricing:', error);
    return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID required' }, { status: 400 });
    }

    await prisma.servicePricing.deleteMany({
      where: { serviceId, salonId: session.user.salonId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete service pricing:', error);
    return NextResponse.json({ error: 'Failed to delete pricing' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    console.log('Services API - Session:', JSON.stringify(session, null, 2));

    if (!session?.user?.salonId) {
      console.log('Services API - No salonId in session');
      return NextResponse.json({ error: 'Unauthorized', debug: 'No salonId' }, { status: 401 });
    }

    const services = await prisma.service.findMany({
      where: {
        salonId: session.user.salonId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        durationMinutes: true,
        basePrice: true,
        active: true,
      },
      orderBy: { name: 'asc' },
    });

    console.log('Services API - Found', services.length, 'services for salonId:', session.user.salonId);

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Services fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, category, durationMinutes, basePrice, active } = body;

    if (!name || !durationMinutes || basePrice === undefined) {
      return NextResponse.json({ error: 'Name, duration, and price are required' }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        salonId: user.salonId,
        name,
        description: description || null,
        category: category || 'OTHER',
        durationMinutes: parseInt(durationMinutes),
        basePrice: parseFloat(basePrice),
        active: active ?? true,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error('Service create error:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}

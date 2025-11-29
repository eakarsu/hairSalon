import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'Salon ID required' }, { status: 400 });
    }

    const services = await prisma.service.findMany({
      where: {
        salonId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        basePrice: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Public services fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

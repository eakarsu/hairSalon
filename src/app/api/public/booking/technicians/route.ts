import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'Salon ID required' }, { status: 400 });
    }

    const technicians = await prisma.user.findMany({
      where: {
        salonId,
        role: 'TECHNICIAN',
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ technicians });
  } catch (error) {
    console.error('Public technicians fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

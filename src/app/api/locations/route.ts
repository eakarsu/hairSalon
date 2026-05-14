import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locations = await prisma.location.findMany({
      where: { salonId: session.user.salonId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Locations fetch error:', error);
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
    const { name, address, phone, timezone } = body;

    if (!name || !address || !phone) {
      return NextResponse.json(
        { error: 'Name, address, and phone are required' },
        { status: 400 }
      );
    }

    const location = await prisma.location.create({
      data: {
        salonId: session.user.salonId,
        name,
        address,
        phone,
        timezone: timezone || 'America/New_York',
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error('Location create error:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}

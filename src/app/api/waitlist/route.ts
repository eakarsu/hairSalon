import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const todayOnly = searchParams.get('today') === 'true';

    const where: Record<string, unknown> = {
      salonId: session.user.salonId,
    };

    if (status) {
      where.status = status;
    }

    if (todayOnly) {
      const today = new Date();
      where.createdAt = {
        gte: startOfDay(today),
        lte: endOfDay(today),
      };
    }

    const entries = await prisma.waitlist.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Waitlist fetch error:', error);
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
    const { clientId, clientName, clientPhone, partySize, serviceId, preferredTech, notes } = body;

    if (!clientName || !clientPhone) {
      return NextResponse.json({ error: 'Name and phone required' }, { status: 400 });
    }

    // Get current waitlist count for estimated wait
    const waitingCount = await prisma.waitlist.count({
      where: {
        salonId: session.user.salonId,
        status: 'WAITING',
      },
    });

    const estimatedWait = waitingCount * 20; // 20 min per person

    const entry = await prisma.waitlist.create({
      data: {
        salonId: session.user.salonId,
        clientId: clientId || null,
        clientName,
        clientPhone,
        partySize: partySize || 1,
        serviceId: serviceId || null,
        preferredTech: preferredTech || null,
        notes: notes || null,
        estimatedWait,
        status: 'WAITING',
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({ entry, position: waitingCount + 1 });
  } catch (error) {
    console.error('Waitlist create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

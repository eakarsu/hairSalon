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

    const clients = await prisma.client.findMany({
      where: { salonId: session.user.salonId },
      include: {
        preferredTech: { select: { name: true } },
        loyaltyAccount: { select: { pointsBalance: true, tier: true } },
        _count: { select: { appointments: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        preferredLanguage: c.preferredLanguage,
        preferredTechName: c.preferredTech?.name || null,
        marketingOptIn: c.marketingOptIn,
        loyaltyPoints: c.loyaltyAccount?.pointsBalance || 0,
        loyaltyTier: c.loyaltyAccount?.tier || 'BRONZE',
        totalVisits: c._count.appointments,
        lastVisit: null,
        birthday: c.birthday ? c.birthday.toISOString() : null,
        notes: c.notes,
      })),
    });
  } catch (error) {
    console.error('Clients fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    console.log('Client API POST - Session:', JSON.stringify(session, null, 2));

    if (!session?.user?.salonId) {
      console.log('Client API POST - No salonId in session');
      return NextResponse.json({ error: 'Unauthorized', debug: 'No salonId in session' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Client API POST - Body:', JSON.stringify(body, null, 2));

    const { name, phone, email, preferredLanguage, marketingOptIn, notes, birthday } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        salonId: session.user.salonId,
        name,
        phone,
        email: email || null,
        preferredLanguage: preferredLanguage || 'en',
        marketingOptIn: marketingOptIn ?? true,
        notes: notes || null,
        birthday: birthday ? new Date(birthday) : null,
      },
    });

    // Create loyalty account for new client
    await prisma.loyaltyAccount.create({
      data: {
        salonId: session.user.salonId,
        clientId: client.id,
        pointsBalance: 0,
        tier: 'BRONZE',
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Client create error:', error);
    return NextResponse.json({ error: 'Failed to create client', details: String(error) }, { status: 500 });
  }
}

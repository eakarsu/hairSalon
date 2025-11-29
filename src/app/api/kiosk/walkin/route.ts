import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salonId, clientName, clientPhone, serviceId, preferredTech, notes } = body;

    if (!salonId || !clientName || !clientPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if client exists
    let client = await prisma.client.findFirst({
      where: {
        salonId,
        phone: { contains: clientPhone.replace(/\D/g, '') },
      },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          salonId,
          name: clientName,
          phone: clientPhone,
          marketingOptIn: true,
        },
      });
    }

    // Get current waitlist count for estimated wait time
    const waitingCount = await prisma.waitlist.count({
      where: {
        salonId,
        status: 'WAITING',
      },
    });

    // Estimate 20 minutes per person ahead
    const estimatedWait = waitingCount * 20;

    // Add to waitlist
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        salonId,
        clientId: client.id,
        clientName,
        clientPhone,
        serviceId: serviceId || null,
        preferredTech: preferredTech || null,
        notes: notes || null,
        estimatedWait,
        status: 'WAITING',
      },
    });

    return NextResponse.json({
      success: true,
      waitlist: {
        id: waitlistEntry.id,
        position: waitingCount + 1,
        estimatedWait,
      },
    });
  } catch (error) {
    console.error('Walk-in registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

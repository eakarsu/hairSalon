import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireKiosk } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salonId, clientName, clientPhone, serviceId, preferredTech, notes } = body;

    if (!salonId || !clientName || !clientPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    await requireKiosk(request.headers, salonId);

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
          marketingOptIn: false,
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
    return routeError(error);
  }
}

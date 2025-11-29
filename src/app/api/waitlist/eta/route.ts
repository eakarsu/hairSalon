import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const waitlistId = searchParams.get('waitlistId');

    if (!salonId) {
      return NextResponse.json({ error: 'Salon ID is required' }, { status: 400 });
    }

    // Get all waiting entries
    const waitingEntries = await prisma.waitlist.findMany({
      where: {
        salonId,
        status: 'WAITING',
      },
      orderBy: { createdAt: 'asc' },
      include: {
        client: true,
      },
    });

    // Get current ongoing appointments
    const now = new Date();
    const ongoingAppointments = await prisma.appointment.findMany({
      where: {
        salonId,
        status: { in: ['BOOKED', 'CONFIRMED'] },
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        service: true,
        technician: true,
      },
    });

    // Calculate average service time (based on recent completions)
    const recentCompletions = await prisma.appointment.findMany({
      where: {
        salonId,
        status: 'COMPLETED',
        endTime: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
      include: {
        service: true,
      },
    });

    // Calculate average time per appointment
    let avgServiceTime = 45; // Default 45 minutes
    if (recentCompletions.length > 0) {
      const totalDuration = recentCompletions.reduce(
        (sum, apt) => sum + apt.service.durationMinutes,
        0
      );
      avgServiceTime = Math.round(totalDuration / recentCompletions.length);
    }

    // Count available technicians
    const availableTechs = await prisma.user.count({
      where: {
        salonId,
        role: 'TECHNICIAN',
        active: true,
      },
    });

    // Calculate wait times for each entry
    const waitlistWithETA = waitingEntries.map((entry, index) => {
      // Estimate based on position in queue and service times
      const busyChairs = ongoingAppointments.length;
      const freeChairs = Math.max(0, availableTechs - busyChairs);

      let estimatedWaitMinutes: number;

      if (freeChairs > 0 && index < freeChairs) {
        // Can be seated immediately or very soon
        estimatedWaitMinutes = index * 5; // 5 min buffer per person ahead
      } else {
        // Need to wait for current appointments to finish
        const waitPosition = index - freeChairs;
        const cycleTime = avgServiceTime / Math.max(1, availableTechs);
        estimatedWaitMinutes = Math.round(cycleTime * (1 + waitPosition));
      }

      // Factor in party size if multiple people
      if (entry.partySize > 1) {
        estimatedWaitMinutes += (entry.partySize - 1) * 10;
      }

      return {
        id: entry.id,
        clientName: entry.clientName,
        partySize: entry.partySize,
        position: index + 1,
        estimatedWaitMinutes,
        estimatedWaitDisplay: formatWaitTime(estimatedWaitMinutes),
        createdAt: entry.createdAt,
        status: entry.status,
      };
    });

    // If specific waitlist ID requested, return just that entry
    if (waitlistId) {
      const specificEntry = waitlistWithETA.find(e => e.id === waitlistId);
      if (!specificEntry) {
        return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
      }
      return NextResponse.json({
        entry: specificEntry,
        totalWaiting: waitingEntries.length,
        availableTechnicians: freeChairs,
      });
    }

    return NextResponse.json({
      waitlist: waitlistWithETA,
      stats: {
        totalWaiting: waitingEntries.length,
        activeTechnicians: availableTechs,
        busyTechnicians: ongoingAppointments.length,
        availableTechnicians: Math.max(0, availableTechs - ongoingAppointments.length),
        avgServiceTime,
      },
    });
  } catch (error) {
    console.error('Get waitlist ETA error:', error);
    return NextResponse.json({ error: 'Failed to calculate wait times' }, { status: 500 });
  }
}

function formatWaitTime(minutes: number): string {
  if (minutes < 5) {
    return 'Ready now';
  } else if (minutes < 15) {
    return '5-15 min';
  } else if (minutes < 30) {
    return '15-30 min';
  } else if (minutes < 45) {
    return '30-45 min';
  } else if (minutes < 60) {
    return '45-60 min';
  } else {
    const hours = Math.floor(minutes / 60);
    return `${hours}+ hour${hours > 1 ? 's' : ''}`;
  }
}

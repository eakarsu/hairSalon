import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const salonId = session.user.salonId;
    const today = new Date();
    const weekAgo = subDays(today, 7);
    const monthAgo = subDays(today, 30);

    // Get today's appointments
    const todayAppointments = await prisma.appointment.count({
      where: {
        salonId,
        startTime: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
        status: { in: ['BOOKED', 'CONFIRMED'] },
      },
    });

    // Get weekly completed appointments with services for revenue calculation
    const weeklyAppointments = await prisma.appointment.findMany({
      where: {
        salonId,
        startTime: { gte: weekAgo },
        status: 'COMPLETED',
      },
      include: { service: true },
    });

    const weeklyRevenue = weeklyAppointments.reduce((sum, appt) => sum + appt.service.basePrice, 0);

    // Active clients (visited in last 30 days)
    const activeClients = await prisma.client.count({
      where: {
        salonId,
        appointments: {
          some: {
            startTime: { gte: monthAgo },
            status: 'COMPLETED',
          },
        },
      },
    });

    // No-show rate (last 30 days)
    const totalAppointments = await prisma.appointment.count({
      where: {
        salonId,
        startTime: { gte: monthAgo, lte: today },
      },
    });

    const noShows = await prisma.appointment.count({
      where: {
        salonId,
        startTime: { gte: monthAgo, lte: today },
        status: 'NO_SHOW',
      },
    });

    const noShowRate = totalAppointments > 0 ? (noShows / totalAppointments) * 100 : 0;

    // Repeat visit rate
    const clientsWithMultipleVisits = await prisma.client.count({
      where: {
        salonId,
        appointments: {
          some: {
            startTime: { gte: subDays(today, 60) },
            status: 'COMPLETED',
          },
        },
      },
    });

    const totalClientsWithVisits = await prisma.client.count({
      where: {
        salonId,
        appointments: { some: { status: 'COMPLETED' } },
      },
    });

    const repeatVisitRate = totalClientsWithVisits > 0
      ? (clientsWithMultipleVisits / totalClientsWithVisits) * 100
      : 0;

    // Loyalty engagement
    const totalClients = await prisma.client.count({ where: { salonId } });
    const loyaltyMembers = await prisma.loyaltyAccount.count({ where: { salonId } });
    const loyaltyUsage = totalClients > 0 ? (loyaltyMembers / totalClients) * 100 : 0;

    // Average rating
    const ratings = await prisma.visit.aggregate({
      where: {
        appointment: { salonId },
        rating: { not: null },
      },
      _avg: { rating: true },
    });

    const avgRating = ratings._avg.rating || 4.5;

    // Upcoming appointments
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        salonId,
        startTime: { gte: today },
        status: { in: ['BOOKED', 'CONFIRMED'] },
      },
      include: {
        client: true,
        service: true,
        technician: true,
      },
      orderBy: { startTime: 'asc' },
      take: 5,
    });

    // Recent no-shows
    const recentNoShows = await prisma.appointment.findMany({
      where: {
        salonId,
        status: 'NO_SHOW',
      },
      include: { client: true },
      orderBy: { startTime: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      todayAppointments,
      weeklyRevenue,
      activeClients,
      noShowRate: Math.round(noShowRate * 10) / 10,
      repeatVisitRate: Math.round(repeatVisitRate),
      loyaltyUsage: Math.round(loyaltyUsage),
      avgRating: Math.round(avgRating * 10) / 10,
      upcomingAppointments: upcomingAppointments.map((a) => ({
        id: a.id,
        clientName: a.client.name,
        serviceName: a.service.name,
        technicianName: a.technician.name,
        startTime: a.startTime.toISOString(),
        status: a.status,
      })),
      recentNoShows: recentNoShows.map((a) => ({
        id: a.id,
        clientName: a.client.name,
        date: a.startTime.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

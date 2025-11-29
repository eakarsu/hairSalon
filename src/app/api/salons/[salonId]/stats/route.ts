import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ salonId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { salonId } = await params;

    // Verify access to this salon
    const userInSalon = await prisma.user.findFirst({
      where: {
        email: session.user.email,
        salonId,
        role: { in: ['OWNER', 'MANAGER'] },
      },
    });

    if (!userInSalon) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);

    // Get comprehensive stats
    const [
      totalClients,
      totalAppointments,
      todayAppointments,
      monthRevenue,
      activeStaff,
      noShowRate,
      avgRating,
    ] = await Promise.all([
      // Total clients
      prisma.client.count({ where: { salonId } }),

      // Total appointments (last 30 days)
      prisma.appointment.count({
        where: {
          salonId,
          startTime: { gte: thirtyDaysAgo },
        },
      }),

      // Today's appointments
      prisma.appointment.count({
        where: {
          salonId,
          startTime: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
        },
      }),

      // Month revenue
      prisma.payment.aggregate({
        where: {
          salonId,
          status: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),

      // Active staff
      prisma.user.count({
        where: {
          salonId,
          active: true,
          role: { in: ['TECHNICIAN', 'MANAGER', 'FRONTDESK'] },
        },
      }),

      // No-show rate
      prisma.appointment.groupBy({
        by: ['status'],
        where: {
          salonId,
          startTime: { gte: thirtyDaysAgo },
        },
        _count: { status: true },
      }),

      // Average rating from reviews
      prisma.review.aggregate({
        where: { salonId },
        _avg: { rating: true },
      }),
    ]);

    // Calculate no-show rate
    const noShowStats = noShowRate.reduce((acc, s) => {
      acc[s.status] = s._count.status;
      return acc;
    }, {} as Record<string, number>);

    const totalPastAppointments = Object.values(noShowStats).reduce((a, b) => a + b, 0);
    const noShowCount = noShowStats['NO_SHOW'] || 0;
    const noShowPercentage = totalPastAppointments > 0
      ? (noShowCount / totalPastAppointments) * 100
      : 0;

    return NextResponse.json({
      salonId,
      stats: {
        totalClients,
        totalAppointments,
        todayAppointments,
        monthRevenue: monthRevenue._sum.amount || 0,
        activeStaff,
        noShowRate: noShowPercentage.toFixed(1),
        averageRating: avgRating._avg.rating?.toFixed(1) || 'N/A',
      },
    });
  } catch (error) {
    console.error('Get salon stats error:', error);
    return NextResponse.json({ error: 'Failed to get salon stats' }, { status: 500 });
  }
}

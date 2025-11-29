import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'daily';
    const salonId = session.user.salonId;

    let startDate: Date;
    let endDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    const now = new Date();

    switch (reportType) {
      case 'daily':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        previousStartDate = startOfDay(subDays(now, 1));
        previousEndDate = endOfDay(subDays(now, 1));
        break;
      case 'weekly':
        startDate = startOfDay(subDays(now, 7));
        endDate = endOfDay(now);
        previousStartDate = startOfDay(subDays(now, 14));
        previousEndDate = endOfDay(subDays(now, 7));
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        previousStartDate = startOfMonth(subMonths(now, 1));
        previousEndDate = endOfMonth(subMonths(now, 1));
        break;
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        previousStartDate = startOfDay(subDays(now, 1));
        previousEndDate = endOfDay(subDays(now, 1));
    }

    // Get appointments for the period
    const appointments = await prisma.appointment.findMany({
      where: {
        salonId,
        startTime: { gte: startDate, lte: endDate },
      },
      include: {
        service: { select: { name: true, basePrice: true } },
        technician: { select: { id: true, name: true } },
        payment: true,
        tip: true,
      },
    });

    // Previous period appointments for comparison
    const previousAppointments = await prisma.appointment.findMany({
      where: {
        salonId,
        startTime: { gte: previousStartDate, lte: previousEndDate },
      },
      include: {
        service: { select: { basePrice: true } },
        payment: true,
      },
    });

    // Calculate metrics
    const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED');
    const previousCompleted = previousAppointments.filter((a) => a.status === 'COMPLETED');

    const totalRevenue = completedAppointments.reduce((sum, a) => {
      return sum + (a.payment?.amount || a.service.basePrice);
    }, 0);

    const previousRevenue = previousCompleted.reduce((sum, a) => {
      return sum + (a.payment?.amount || a.service.basePrice);
    }, 0);

    const totalTips = completedAppointments.reduce((sum, a) => sum + (a.tip?.amount || 0), 0);

    const noShows = appointments.filter((a) => a.status === 'NO_SHOW').length;
    const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;

    // Revenue by service
    const revenueByService: Record<string, { name: string; revenue: number; count: number }> = {};
    completedAppointments.forEach((apt) => {
      const serviceName = apt.service.name;
      if (!revenueByService[serviceName]) {
        revenueByService[serviceName] = { name: serviceName, revenue: 0, count: 0 };
      }
      revenueByService[serviceName].revenue += apt.payment?.amount || apt.service.basePrice;
      revenueByService[serviceName].count += 1;
    });

    // Revenue by technician
    const revenueByTechnician: Record<string, { name: string; revenue: number; count: number; tips: number }> = {};
    completedAppointments.forEach((apt) => {
      const techId = apt.technician.id;
      if (!revenueByTechnician[techId]) {
        revenueByTechnician[techId] = {
          name: apt.technician.name,
          revenue: 0,
          count: 0,
          tips: 0,
        };
      }
      revenueByTechnician[techId].revenue += apt.payment?.amount || apt.service.basePrice;
      revenueByTechnician[techId].count += 1;
      revenueByTechnician[techId].tips += apt.tip?.amount || 0;
    });

    // Booking source breakdown
    const bookingsBySource = {
      ONLINE: appointments.filter((a) => a.source === 'ONLINE').length,
      PHONE: appointments.filter((a) => a.source === 'PHONE').length,
      WALKIN: appointments.filter((a) => a.source === 'WALKIN').length,
    };

    // New clients
    const newClients = await prisma.client.count({
      where: {
        salonId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const previousNewClients = await prisma.client.count({
      where: {
        salonId,
        createdAt: { gte: previousStartDate, lte: previousEndDate },
      },
    });

    return NextResponse.json({
      period: reportType,
      startDate,
      endDate,
      summary: {
        totalAppointments: appointments.length,
        completedAppointments: completedAppointments.length,
        noShows,
        cancelled,
        totalRevenue,
        previousRevenue,
        revenueChange: previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0,
        totalTips,
        newClients,
        previousNewClients,
        averageTicket: completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0,
      },
      revenueByService: Object.values(revenueByService).sort((a, b) => b.revenue - a.revenue),
      revenueByTechnician: Object.values(revenueByTechnician).sort((a, b) => b.revenue - a.revenue),
      bookingsBySource,
    });
  } catch (error) {
    console.error('Reports fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

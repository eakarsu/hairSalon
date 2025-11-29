import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import openRouterClient from '@/lib/openRouterClient';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and owners can access staff insights
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { technicianId } = await request.json();

    if (!technicianId) {
      return NextResponse.json({ error: 'Technician ID is required' }, { status: 400 });
    }

    // Get technician
    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
    });

    if (!technician || technician.salonId !== session.user.salonId) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get appointment stats
    const appointments = await prisma.appointment.findMany({
      where: {
        technicianId,
        startTime: { gte: thirtyDaysAgo },
      },
      include: {
        service: true,
        client: true,
        visit: true,
        payment: true,
      },
    });

    const appointmentsCount = appointments.length;
    const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;
    const noShowCount = appointments.filter(a => a.status === 'NO_SHOW').length;

    // Calculate average rating from visits
    const ratings = appointments
      .filter(a => a.visit?.rating)
      .map(a => a.visit!.rating!);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    // Calculate repeat client rate
    const clientIds = appointments.map(a => a.clientId);
    const uniqueClients = [...new Set(clientIds)];
    const repeatClients = await prisma.appointment.groupBy({
      by: ['clientId'],
      where: {
        technicianId,
        clientId: { in: uniqueClients },
        status: 'COMPLETED',
      },
      _count: { clientId: true },
      having: { clientId: { _count: { gt: 1 } } },
    });
    const repeatClientRate = uniqueClients.length > 0
      ? repeatClients.length / uniqueClients.length
      : 0;

    // Calculate average ticket
    const payments = appointments
      .filter(a => a.payment?.status === 'COMPLETED')
      .map(a => a.payment!.amount);
    const averageTicket = payments.length > 0
      ? payments.reduce((sum, p) => sum + p, 0) / payments.length
      : 0;

    // Get top services
    const serviceCount = appointments.reduce((acc, a) => {
      acc[a.service.name] = (acc[a.service.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topServices = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // Get recent feedback (from visits with design descriptions as proxy)
    const recentFeedback = appointments
      .filter(a => a.visit?.designDescription)
      .slice(0, 5)
      .map(a => `${a.client.name}: ${a.visit!.designDescription}`);

    // Get AI insights
    const insights = await openRouterClient.analyzeStaffPerformance({
      technicianName: technician.name,
      appointmentsCount,
      completedCount,
      noShowCount,
      averageRating,
      repeatClientRate,
      averageTicket,
      topServices,
      recentFeedback,
    });

    // Log to AI audit
    await prisma.aIAuditLog.create({
      data: {
        salonId: session.user.salonId,
        contextType: 'STAFF_INSIGHTS',
        inputSummary: `Performance analysis for ${technician.name}`,
        outputSummary: insights.substring(0, 500),
      },
    });

    return NextResponse.json({
      insights,
      metrics: {
        appointmentsCount,
        completedCount,
        noShowCount,
        averageRating,
        repeatClientRate,
        averageTicket,
        topServices,
      },
      technician: {
        id: technician.id,
        name: technician.name,
      },
    });
  } catch (error) {
    console.error('AI Staff Insights error:', error);
    return NextResponse.json({ error: 'Failed to generate staff insights' }, { status: 500 });
  }
}

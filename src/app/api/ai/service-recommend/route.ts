import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import openRouterClient from '@/lib/openRouterClient';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Get client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client || client.salonId !== session.user.salonId) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get client's visit history
    const visits = await prisma.visit.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        appointment: {
          include: { service: true },
        },
      },
    });

    // Get available services
    const services = await prisma.service.findMany({
      where: { salonId: session.user.salonId, active: true },
      include: {
        addons: { where: { active: true } },
      },
    });

    // Analyze visit history
    const visitHistory = visits.map(v =>
      `${v.appointment.service.name}${v.designDescription ? ` (${v.designDescription})` : ''}`
    );

    const lastServices = visits.slice(0, 3).map(v => v.appointment.service.name);

    // Get popular services (trending)
    const popularServices = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        salonId: session.user.salonId,
        status: 'COMPLETED',
        startTime: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 5,
    });

    const trendingServiceIds = popularServices.map(p => p.serviceId);
    const trendingServices = services
      .filter(s => trendingServiceIds.includes(s.id))
      .map(s => s.name);

    // Format services list
    const availableServicesList = services.map(s =>
      `${s.name} - $${s.basePrice} (${s.durationMinutes} min)${s.addons.length > 0 ? ` [Add-ons: ${s.addons.map(a => a.name).join(', ')}]` : ''}`
    );

    // Get AI recommendations
    const recommendations = await openRouterClient.recommendServices({
      clientName: client.name,
      visitHistory,
      lastServices,
      seasonMonth: format(new Date(), 'MMMM'),
      currentTrends: trendingServices,
      availableServices: availableServicesList,
    });

    // Log to AI audit
    await prisma.aIAuditLog.create({
      data: {
        salonId: session.user.salonId,
        clientId,
        contextType: 'SERVICE_RECOMMEND',
        inputSummary: `Service recommendations for ${client.name}`,
        outputSummary: recommendations.substring(0, 500),
      },
    });

    return NextResponse.json({
      recommendations,
      client: {
        id: client.id,
        name: client.name,
      },
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        price: s.basePrice,
        duration: s.durationMinutes,
        addons: s.addons,
      })),
    });
  } catch (error) {
    console.error('AI Service Recommend error:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import openRouterClient from '@/lib/openRouterClient';
import { format, differenceInDays } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointmentId } = await request.json();

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        service: true,
        technician: true,
      },
    });

    if (!appointment || appointment.salonId !== session.user.salonId) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Get client history
    const clientAppointments = await prisma.appointment.findMany({
      where: {
        clientId: appointment.clientId,
        id: { not: appointmentId },
      },
      orderBy: { startTime: 'desc' },
    });

    const totalAppointments = clientAppointments.length;
    const noShows = clientAppointments.filter(a => a.status === 'NO_SHOW').length;
    const cancellations = clientAppointments.filter(a => a.status === 'CANCELLED').length;

    // Last visit
    const lastCompletedVisit = clientAppointments.find(a => a.status === 'COMPLETED');
    const lastVisitDays = lastCompletedVisit
      ? differenceInDays(new Date(), lastCompletedVisit.startTime)
      : 999;

    // Average booking advance
    const bookingAdvances = clientAppointments.map(a =>
      differenceInDays(a.startTime, a.createdAt)
    );
    const averageBookingAdvance = bookingAdvances.length > 0
      ? bookingAdvances.reduce((sum, d) => sum + d, 0) / bookingAdvances.length
      : 0;

    // Appointment factors
    const daysInAdvance = differenceInDays(appointment.startTime, appointment.createdAt);
    const isWeekend = [0, 6].includes(appointment.startTime.getDay());
    const hour = appointment.startTime.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const isNewClient = totalAppointments === 0;

    // Get AI prediction
    const prediction = await openRouterClient.predictNoShowRisk({
      clientName: appointment.client.name,
      appointmentDetails: `${appointment.service.name} on ${format(appointment.startTime, 'EEEE, MMM d')} at ${format(appointment.startTime, 'h:mm a')} with ${appointment.technician.name}`,
      clientHistory: {
        totalAppointments,
        noShows,
        cancellations,
        lastVisitDays,
        averageBookingAdvance,
      },
      appointmentFactors: {
        daysInAdvance,
        isWeekend,
        timeOfDay,
        isNewClient,
      },
    });

    // Save prediction to database
    const riskLevel = prediction.riskScore < 0.3 ? 'LOW' : prediction.riskScore < 0.6 ? 'MEDIUM' : 'HIGH';

    await prisma.noShowPrediction.upsert({
      where: { appointmentId },
      create: {
        salonId: session.user.salonId,
        appointmentId,
        riskScore: prediction.riskScore,
        riskLevel: riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
        factors: prediction.factors,
      },
      update: {
        riskScore: prediction.riskScore,
        riskLevel: riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
        factors: prediction.factors,
      },
    });

    // Log to AI audit
    await prisma.aIAuditLog.create({
      data: {
        salonId: session.user.salonId,
        clientId: appointment.clientId,
        contextType: 'NOSHOW_PREDICT',
        inputSummary: `No-show prediction for ${appointment.client.name}`,
        outputSummary: `Risk: ${riskLevel} (${(prediction.riskScore * 100).toFixed(0)}%) - ${prediction.recommendation}`,
      },
    });

    return NextResponse.json({
      prediction: {
        ...prediction,
        riskLevel,
      },
      appointment: {
        id: appointment.id,
        clientName: appointment.client.name,
        serviceName: appointment.service.name,
        dateTime: appointment.startTime,
      },
    });
  } catch (error) {
    console.error('AI No-Show Predict error:', error);
    return NextResponse.json({ error: 'Failed to predict no-show risk' }, { status: 500 });
  }
}

// Batch predict for all upcoming appointments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get upcoming appointments without predictions
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        salonId: session.user.salonId,
        startTime: { gte: new Date() },
        status: { in: ['BOOKED', 'CONFIRMED'] },
        noShowPrediction: null,
      },
      include: {
        client: true,
        service: true,
      },
      take: 20,
    });

    // Get existing high-risk predictions
    const highRiskPredictions = await prisma.noShowPrediction.findMany({
      where: {
        salonId: session.user.salonId,
        riskLevel: { in: ['MEDIUM', 'HIGH'] },
        notified: false,
        appointment: {
          startTime: { gte: new Date() },
          status: { in: ['BOOKED', 'CONFIRMED'] },
        },
      },
      include: {
        appointment: {
          include: {
            client: true,
            service: true,
          },
        },
      },
    });

    return NextResponse.json({
      needsPrediction: upcomingAppointments.map(a => ({
        id: a.id,
        clientName: a.client.name,
        service: a.service.name,
        dateTime: a.startTime,
      })),
      highRisk: highRiskPredictions.map(p => ({
        appointmentId: p.appointmentId,
        clientName: p.appointment.client.name,
        service: p.appointment.service.name,
        dateTime: p.appointment.startTime,
        riskScore: p.riskScore,
        riskLevel: p.riskLevel,
        factors: p.factors,
      })),
    });
  } catch (error) {
    console.error('Get no-show predictions error:', error);
    return NextResponse.json({ error: 'Failed to get predictions' }, { status: 500 });
  }
}

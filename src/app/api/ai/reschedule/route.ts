import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import openRouterClient from '@/lib/openRouterClient';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';

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

    // Get the appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        technician: true,
        service: true,
      },
    });

    if (!appointment || appointment.salonId !== session.user.salonId) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Get client's appointment history for pattern analysis
    const clientHistory = await prisma.appointment.findMany({
      where: {
        clientId: appointment.clientId,
        status: 'COMPLETED',
      },
      orderBy: { startTime: 'desc' },
      take: 10,
      select: {
        startTime: true,
        service: { select: { name: true } },
      },
    });

    // Format history for AI
    const historyStr = clientHistory.length > 0
      ? clientHistory.map(h => `${format(h.startTime, 'EEEE')} at ${format(h.startTime, 'h:mm a')} - ${h.service.name}`).join('; ')
      : 'New client - no history';

    // Get available slots for the next 14 days
    const startDate = startOfDay(new Date());
    const endDate = endOfDay(addDays(startDate, 14));

    // Get technician's schedule
    const schedules = await prisma.staffSchedule.findMany({
      where: {
        technicianId: appointment.technicianId,
        isWorking: true,
      },
    });

    // Get existing appointments for the technician
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        technicianId: appointment.technicianId,
        startTime: { gte: startDate, lte: endDate },
        status: { in: ['BOOKED', 'CONFIRMED'] },
        id: { not: appointmentId },
      },
      select: { startTime: true, endTime: true },
    });

    // Generate available slots (simplified - real implementation would be more complex)
    const availableSlots: string[] = [];
    const serviceDuration = appointment.service.durationMinutes;

    for (let day = 0; day < 14 && availableSlots.length < 20; day++) {
      const currentDate = addDays(startDate, day);
      const dayOfWeek = currentDate.getDay();
      const schedule = schedules.find(s => s.dayOfWeek === dayOfWeek);

      if (schedule) {
        const [startHour] = schedule.startTime.split(':').map(Number);
        const [endHour] = schedule.endTime.split(':').map(Number);

        for (let hour = startHour; hour < endHour - 1; hour++) {
          for (const minute of [0, 30]) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, minute, 0, 0);

            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

            // Check if slot conflicts with existing appointments
            const hasConflict = existingAppointments.some(apt =>
              (slotStart >= apt.startTime && slotStart < apt.endTime) ||
              (slotEnd > apt.startTime && slotEnd <= apt.endTime)
            );

            if (!hasConflict && slotStart > new Date()) {
              availableSlots.push(format(slotStart, "EEEE, MMM d 'at' h:mm a"));
              if (availableSlots.length >= 20) break;
            }
          }
        }
      }
    }

    if (availableSlots.length === 0) {
      return NextResponse.json({
        suggestions: 'No available slots found in the next 14 days. Please contact the salon directly.',
        availableSlots: [],
      });
    }

    // Get AI suggestions
    const suggestions = await openRouterClient.suggestRescheduleSlots({
      clientName: appointment.client.name,
      originalDateTime: format(appointment.startTime, "EEEE, MMM d 'at' h:mm a"),
      preferredTechnician: appointment.technician.name,
      serviceName: appointment.service.name,
      availableSlots,
      clientHistory: historyStr,
    });

    // Log to AI audit
    await prisma.aIAuditLog.create({
      data: {
        salonId: session.user.salonId,
        clientId: appointment.clientId,
        contextType: 'RESCHEDULE',
        inputSummary: `Reschedule for ${appointment.client.name} - ${appointment.service.name}`,
        outputSummary: suggestions.substring(0, 500),
      },
    });

    return NextResponse.json({
      suggestions,
      availableSlots,
      appointment: {
        id: appointment.id,
        clientName: appointment.client.name,
        serviceName: appointment.service.name,
        originalTime: appointment.startTime,
      },
    });
  } catch (error) {
    console.error('AI Reschedule error:', error);
    return NextResponse.json({ error: 'Failed to generate reschedule suggestions' }, { status: 500 });
  }
}

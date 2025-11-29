import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addWeeks, addMonths, setDay, setDate, setHours, setMinutes, startOfDay, addDays, isBefore } from 'date-fns';

// Generate appointments from recurring templates
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { daysAhead = 30 } = await request.json();

    // Get all active recurring appointments for the salon
    const recurringAppointments = await prisma.recurringAppointment.findMany({
      where: {
        salonId: session.user.salonId,
        active: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      include: {
        service: true,
      },
    });

    const generatedAppointments = [];
    const endWindow = addDays(new Date(), daysAhead);

    for (const recurring of recurringAppointments) {
      let nextDate = recurring.nextOccurrence || new Date();
      const [hours, minutes] = recurring.preferredTime.split(':').map(Number);

      // Generate appointments up to the window
      while (isBefore(nextDate, endWindow)) {
        // Skip if past end date
        if (recurring.endDate && isBefore(recurring.endDate, nextDate)) {
          break;
        }

        // Check if appointment already exists for this date
        const existingAppointment = await prisma.appointment.findFirst({
          where: {
            clientId: recurring.clientId,
            technicianId: recurring.technicianId,
            serviceId: recurring.serviceId,
            startTime: {
              gte: startOfDay(nextDate),
              lt: addDays(startOfDay(nextDate), 1),
            },
          },
        });

        if (!existingAppointment) {
          // Calculate end time
          const endTime = new Date(nextDate);
          endTime.setMinutes(endTime.getMinutes() + recurring.service.durationMinutes);

          // Create the appointment
          const appointment = await prisma.appointment.create({
            data: {
              salonId: recurring.salonId,
              clientId: recurring.clientId,
              technicianId: recurring.technicianId,
              serviceId: recurring.serviceId,
              startTime: nextDate,
              endTime,
              status: 'BOOKED',
              source: 'ONLINE',
              notes: `Auto-generated from recurring schedule`,
            },
          });

          generatedAppointments.push(appointment);
        }

        // Calculate next occurrence
        nextDate = calculateNextDate(nextDate, recurring.frequency, recurring.dayOfWeek, recurring.dayOfMonth, hours, minutes);
      }

      // Update the next occurrence
      await prisma.recurringAppointment.update({
        where: { id: recurring.id },
        data: { nextOccurrence: nextDate },
      });
    }

    return NextResponse.json({
      success: true,
      generated: generatedAppointments.length,
      appointments: generatedAppointments.map(a => ({
        id: a.id,
        startTime: a.startTime,
        clientId: a.clientId,
      })),
    });
  } catch (error) {
    console.error('Generate recurring appointments error:', error);
    return NextResponse.json({ error: 'Failed to generate appointments' }, { status: 500 });
  }
}

function calculateNextDate(
  currentDate: Date,
  frequency: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
  hours: number = 10,
  minutes: number = 0
): Date {
  let next: Date;

  switch (frequency) {
    case 'WEEKLY':
      next = addWeeks(currentDate, 1);
      break;

    case 'BIWEEKLY':
      next = addWeeks(currentDate, 2);
      break;

    case 'MONTHLY':
      next = addMonths(currentDate, 1);
      if (dayOfMonth) {
        next = setDate(next, dayOfMonth);
      }
      break;

    default:
      next = addWeeks(currentDate, 1);
  }

  next = setHours(next, hours);
  next = setMinutes(next, minutes);

  return next;
}

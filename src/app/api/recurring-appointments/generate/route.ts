import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addWeeks, addMonths, setDate, setHours, setMinutes, startOfDay, addDays, isBefore } from 'date-fns';
import { requireActiveUser } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { bookQuote, createQuote } from '@/lib/field-service/workflow';

// Generate appointments from recurring templates
export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser(['OWNER', 'MANAGER', 'FRONTDESK']);

    const { daysAhead = 30 } = await request.json();

    // Get all active recurring appointments for the salon
    const recurringAppointments = await prisma.recurringAppointment.findMany({
      where: {
        salonId: user.salonId,
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
          const key = `recurring:${recurring.id}:${nextDate.toISOString()}`;
          const sourceRef = `quote:${key}`;
          const taxEvidence = await callFieldProvider('TAX_QUOTE', { sourceRef, idempotencyKey: `tax:${key}`, payload: { salonId: recurring.salonId, currency: 'USD', lineItems: [{ reference: recurring.service.id, description: recurring.service.name, quantity: 1, unitPriceCents: Math.round(recurring.service.basePrice * 100) }] } });
          const quote = await createQuote({ salonId: recurring.salonId, clientId: recurring.clientId, serviceId: recurring.serviceId, technicianId: recurring.technicianId, idempotencyKey: `quote:${key}`, taxEvidence });
          const calendarEvidence = await callFieldProvider('CALENDAR_RESERVE', { sourceRef: quote.quoteNumber, idempotencyKey: `calendar:${key}`, payload: { salonId: recurring.salonId, technicianId: recurring.technicianId, startTime: nextDate.toISOString(), durationMinutes: recurring.service.durationMinutes } });
          const appointment = await bookQuote({ quoteId: quote.id, technicianId: recurring.technicianId, startTime: nextDate, idempotencyKey: key, calendarEvidence, actor: user });
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
    return routeError(error);
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

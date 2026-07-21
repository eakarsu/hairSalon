import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addMinutes, parseISO, format, setHours, setMinutes, isBefore, isAfter } from 'date-fns';
import { getAvailability } from '@/lib/field-service/workflow';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const technicianId = searchParams.get('technicianId');
    const serviceId = searchParams.get('serviceId');
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!salonId || !serviceId || !date) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get service duration
    const service = await prisma.service.findFirst({
      where: { id: serviceId, salonId, active: true },
      select: { durationMinutes: true },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const selectedDate = parseISO(date);
    if (Number.isNaN(selectedDate.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    const settings = await prisma.bookingSettings.findUnique({ where: { salonId } });
    const earliest = new Date(Date.now() + (settings?.minAdvanceHours ?? 2) * 60 * 60 * 1000);
    const latest = new Date(Date.now() + (settings?.maxAdvanceDays ?? 30) * 24 * 60 * 60 * 1000);
    if (selectedDate > latest) return NextResponse.json({ slots: [] });
    const dayOfWeek = selectedDate.getDay();

    // Get available technicians for the day
    const scheduleWhere: Record<string, unknown> = {
      salonId,
      dayOfWeek,
      isWorking: true,
      technician: { salonId, active: true, role: 'TECHNICIAN' },
    };

    if (technicianId) {
      scheduleWhere.technicianId = technicianId;
    }

    const schedules = await prisma.staffSchedule.findMany({
      where: scheduleWhere,
      include: {
        technician: {
          select: { id: true, name: true },
        },
      },
    });

    if (schedules.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // Get existing appointments for the day
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        salonId,
        technicianId: technicianId ? technicianId : { in: schedules.map(s => s.technicianId) },
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { in: ['BOOKED', 'CONFIRMED'] },
      },
      select: {
        technicianId: true,
        startTime: true,
        endTime: true,
      },
    });

    // Generate available time slots
    const slots: Array<{ time: string; technicianId: string; technicianName: string }> = [];
    const now = new Date();

    for (const schedule of schedules) {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);

      let slotStart = setMinutes(setHours(new Date(selectedDate), startHour), startMin);
      const scheduleEnd = setMinutes(setHours(new Date(selectedDate), endHour), endMin);

      while (isBefore(addMinutes(slotStart, service.durationMinutes), scheduleEnd) ||
             format(addMinutes(slotStart, service.durationMinutes), 'HH:mm') === format(scheduleEnd, 'HH:mm')) {
        // Skip past times
        if (isBefore(slotStart, now) || isBefore(slotStart, earliest)) {
          slotStart = addMinutes(slotStart, 30);
          continue;
        }

        const slotEnd = addMinutes(slotStart, service.durationMinutes);

        // Check for conflicts
        const hasConflict = existingAppointments.some(apt => {
          if (apt.technicianId !== schedule.technicianId) return false;
          const aptStart = new Date(apt.startTime);
          const aptEnd = new Date(apt.endTime);
          return (
            (slotStart >= aptStart && slotStart < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (slotStart <= aptStart && slotEnd >= aptEnd)
          );
        });

        if (!hasConflict) {
          try {
            await getAvailability({ salonId, serviceId, technicianId: schedule.technicianId, startTime: slotStart, endTime: slotEnd });
            slots.push({
              time: format(slotStart, 'HH:mm'),
              technicianId: schedule.technicianId,
              technicianName: schedule.technician.name,
            });
          } catch {
            // Skill, time-off, schedule, or resource constraint makes this slot unavailable.
          }
        }

        slotStart = addMinutes(slotStart, 30);
      }
    }

    // Sort slots by time
    slots.sort((a, b) => a.time.localeCompare(b.time));

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Availability fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

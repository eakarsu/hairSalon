import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addWeeks, addDays, addMonths, setDay, setDate, setHours, setMinutes, startOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const where = {
      salonId: session.user.salonId,
      active: true,
      ...(clientId && { clientId }),
    };

    const recurringAppointments = await prisma.recurringAppointment.findMany({
      where,
      include: {
        client: true,
        technician: true,
        service: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ recurringAppointments });
  } catch (error) {
    console.error('Get recurring appointments error:', error);
    return NextResponse.json({ error: 'Failed to get recurring appointments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      clientId,
      technicianId,
      serviceId,
      frequency,
      dayOfWeek,
      dayOfMonth,
      preferredTime,
      startDate,
      endDate,
    } = await request.json();

    if (!clientId || !technicianId || !serviceId || !frequency || !preferredTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate frequency-specific fields
    if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') {
      if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json({ error: 'Day of week is required for weekly frequency' }, { status: 400 });
      }
    }

    if (frequency === 'MONTHLY') {
      if (dayOfMonth === undefined || dayOfMonth < 1 || dayOfMonth > 31) {
        return NextResponse.json({ error: 'Day of month is required for monthly frequency' }, { status: 400 });
      }
    }

    // Calculate next occurrence
    const [hours, minutes] = preferredTime.split(':').map(Number);
    const start = startDate ? new Date(startDate) : new Date();
    let nextOccurrence = calculateNextOccurrence(start, frequency, dayOfWeek, dayOfMonth, hours, minutes);

    const recurringAppointment = await prisma.recurringAppointment.create({
      data: {
        salonId: session.user.salonId,
        clientId,
        technicianId,
        serviceId,
        frequency,
        dayOfWeek: frequency !== 'MONTHLY' ? dayOfWeek : null,
        dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : null,
        preferredTime,
        startDate: start,
        endDate: endDate ? new Date(endDate) : null,
        nextOccurrence,
      },
      include: {
        client: true,
        technician: true,
        service: true,
      },
    });

    return NextResponse.json({ recurringAppointment });
  } catch (error) {
    console.error('Create recurring appointment error:', error);
    return NextResponse.json({ error: 'Failed to create recurring appointment' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, active, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Recurring appointment ID is required' }, { status: 400 });
    }

    const existing = await prisma.recurringAppointment.findUnique({
      where: { id },
    });

    if (!existing || existing.salonId !== session.user.salonId) {
      return NextResponse.json({ error: 'Recurring appointment not found' }, { status: 404 });
    }

    const recurringAppointment = await prisma.recurringAppointment.update({
      where: { id },
      data: {
        ...(active !== undefined && { active }),
        ...updates,
      },
      include: {
        client: true,
        technician: true,
        service: true,
      },
    });

    return NextResponse.json({ recurringAppointment });
  } catch (error) {
    console.error('Update recurring appointment error:', error);
    return NextResponse.json({ error: 'Failed to update recurring appointment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Recurring appointment ID is required' }, { status: 400 });
    }

    const existing = await prisma.recurringAppointment.findUnique({
      where: { id },
    });

    if (!existing || existing.salonId !== session.user.salonId) {
      return NextResponse.json({ error: 'Recurring appointment not found' }, { status: 404 });
    }

    await prisma.recurringAppointment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete recurring appointment error:', error);
    return NextResponse.json({ error: 'Failed to delete recurring appointment' }, { status: 500 });
  }
}

function calculateNextOccurrence(
  fromDate: Date,
  frequency: string,
  dayOfWeek?: number,
  dayOfMonth?: number,
  hours: number = 10,
  minutes: number = 0
): Date {
  let next = startOfDay(fromDate);
  next = setHours(next, hours);
  next = setMinutes(next, minutes);

  // Ensure we're looking at future dates
  if (next <= new Date()) {
    next = addDays(next, 1);
  }

  switch (frequency) {
    case 'WEEKLY':
      // Find next occurrence of the specified day
      next = setDay(next, dayOfWeek!, { weekStartsOn: 0 });
      if (next <= new Date()) {
        next = addWeeks(next, 1);
      }
      break;

    case 'BIWEEKLY':
      next = setDay(next, dayOfWeek!, { weekStartsOn: 0 });
      if (next <= new Date()) {
        next = addWeeks(next, 2);
      }
      break;

    case 'MONTHLY':
      next = setDate(next, dayOfMonth!);
      if (next <= new Date()) {
        next = addMonths(next, 1);
        next = setDate(next, dayOfMonth!);
      }
      break;
  }

  return next;
}

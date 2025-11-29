import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, getAppointmentReminderTemplate } from '@/lib/email';
import { format, addHours, startOfDay, endOfDay } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hoursBefore = 24 } = await request.json();

    // Get salon
    const salon = await prisma.salon.findUnique({
      where: { id: session.user.salonId },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    // Find appointments that need reminders
    const reminderTime = addHours(new Date(), hoursBefore);
    const startOfReminderDay = startOfDay(reminderTime);
    const endOfReminderDay = endOfDay(reminderTime);

    const appointments = await prisma.appointment.findMany({
      where: {
        salonId: session.user.salonId,
        startTime: {
          gte: startOfReminderDay,
          lte: endOfReminderDay,
        },
        status: { in: ['BOOKED', 'CONFIRMED'] },
        client: {
          email: { not: null },
        },
      },
      include: {
        client: true,
        service: true,
        technician: true,
      },
    });

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{ clientName: string; status: string; error?: string }>,
    };

    for (const appointment of appointments) {
      if (!appointment.client.email) {
        results.skipped++;
        results.details.push({
          clientName: appointment.client.name,
          status: 'skipped',
          error: 'No email address',
        });
        continue;
      }

      const emailContent = getAppointmentReminderTemplate({
        clientName: appointment.client.name,
        salonName: salon.name,
        serviceName: appointment.service.name,
        technicianName: appointment.technician.name,
        dateTime: format(appointment.startTime, "EEEE, MMMM d 'at' h:mm a"),
        address: salon.address,
      });

      const result = await sendEmail({
        to: appointment.client.email,
        subject: emailContent.subject,
        body: emailContent.body,
        salonId: session.user.salonId,
      });

      if (result.success) {
        results.sent++;
        results.details.push({
          clientName: appointment.client.name,
          status: 'sent',
        });
      } else {
        results.failed++;
        results.details.push({
          clientName: appointment.client.name,
          status: 'failed',
          error: result.error,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalAppointments: appointments.length,
      ...results,
    });
  } catch (error) {
    console.error('Send reminders error:', error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}

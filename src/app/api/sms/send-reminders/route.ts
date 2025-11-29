import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { twilioClient } from '@/lib/twilio';
import { addHours, isWithinInterval } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { hoursBefore = 24 } = body;

    const now = new Date();
    const reminderWindow = addHours(now, hoursBefore);

    // Find appointments in the reminder window that haven't been reminded
    const appointments = await prisma.appointment.findMany({
      where: {
        salonId: session.user.salonId,
        status: { in: ['BOOKED'] },
        startTime: {
          gte: now,
          lte: reminderWindow,
        },
      },
      include: {
        client: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        technician: { select: { name: true } },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const apt of appointments) {
      if (!apt.client.phone) continue;

      const result = await twilioClient.sendAppointmentReminder({
        to: apt.client.phone,
        clientName: apt.client.name,
        serviceName: apt.service.name,
        appointmentTime: apt.startTime,
        technicianName: apt.technician.name,
        salonId: session.user.salonId,
      });

      // Log the SMS
      await prisma.sMSLog.create({
        data: {
          salonId: session.user.salonId,
          toPhone: apt.client.phone,
          fromPhone: process.env.TWILIO_PHONE_NUMBER || 'not-configured',
          message: `Appointment reminder for ${apt.service.name}`,
          twilioSid: result.sid || null,
          status: result.success ? 'sent' : 'failed',
          errorCode: result.error || null,
        },
      });

      if (result.success) {
        sent++;
        // Update appointment status to confirmed after reminder sent
        await prisma.appointment.update({
          where: { id: apt.id },
          data: { status: 'CONFIRMED' },
        });
      } else {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: appointments.length,
        sent,
        failed,
      },
    });
  } catch (error) {
    console.error('Send reminders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

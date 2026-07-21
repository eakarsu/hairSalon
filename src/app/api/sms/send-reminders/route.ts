import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addHours } from 'date-fns';
import { requireActiveUser } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { recordCommunicationEvidence } from '@/lib/field-service/workflow';

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser(['OWNER', 'MANAGER', 'FRONTDESK']);

    const body = await request.json();
    const { hoursBefore = 24 } = body;

    const now = new Date();
    const reminderWindow = addHours(now, hoursBefore);

    // Find appointments in the reminder window that haven't been reminded
    const appointments = await prisma.appointment.findMany({
      where: {
        salonId: user.salonId,
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

      const message = `Hi ${apt.client.name}, reminder: ${apt.service.name} with ${apt.technician.name} at ${apt.startTime.toISOString()}. Contact the salon to reschedule.`;
      const key = `reminder:${apt.id}:${apt.startTime.toISOString()}`;
      try {
        const evidence = await callFieldProvider('MESSAGE', { sourceRef: apt.appointmentNumber, idempotencyKey: key, payload: { channel: 'SMS', recipient: apt.client.phone, template: 'APPOINTMENT_REMINDER', body: message } });
        await recordCommunicationEvidence({ appointmentId: apt.id, channel: 'SMS', recipient: apt.client.phone, template: 'APPOINTMENT_REMINDER', body: message, evidence, idempotencyKey: key });
        sent++;
      } catch {
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
    return routeError(error);
  }
}

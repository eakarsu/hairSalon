import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeAppointment, requireIdempotencyKey } from '@/lib/api-access';
import { callFieldProvider } from '@/lib/field-service/provider';
import { recordCommunicationEvidence } from '@/lib/field-service/workflow';
import { routeError } from '@/lib/route-error';

export async function POST(request: NextRequest) {
  try {
    const key = requireIdempotencyKey(request.headers);
    const body = await request.json();
    const { appointmentId, to, message, type } = body;

    if (!appointmentId || !to || !message) {
      return NextResponse.json({ error: 'Appointment, recipient, and message required' }, { status: 400 });
    }
    const { appointment } = await authorizeAppointment(appointmentId, request.headers, { roles: ['OWNER', 'MANAGER', 'FRONTDESK'] });
    const client = await prisma.client.findUnique({ where: { id: appointment.clientId }, select: { phone: true } });
    if (!client || client.phone !== to) return NextResponse.json({ error: 'Recipient does not match appointment client' }, { status: 400 });
    const evidence = await callFieldProvider('MESSAGE', { sourceRef: appointment.appointmentNumber, idempotencyKey: key, payload: { channel: 'SMS', recipient: to, template: type || 'MANUAL', body: message } });
    const communication = await recordCommunicationEvidence({ appointmentId, channel: 'SMS', recipient: to, template: type || 'MANUAL', body: message, evidence, idempotencyKey: key });
    return NextResponse.json({ success: true, communication });
  } catch (error) {
    return routeError(error);
  }
}

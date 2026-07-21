import { NextRequest, NextResponse } from 'next/server';
import { authorizeAppointment, requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { issueInvoice } from '@/lib/field-service/workflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const key = requireIdempotencyKey(request.headers);
    const { appointment, user } = await authorizeAppointment(id, request.headers, { roles: ['OWNER', 'MANAGER', 'FRONTDESK'] });
    const evidence = await callFieldProvider('ACCOUNTING_INVOICE', { sourceRef: appointment.appointmentNumber, idempotencyKey: `invoice:${key}`, payload: { appointmentId: appointment.id, subtotalCents: appointment.serviceCents + appointment.travelCents + appointment.changeOrderCents, taxCents: appointment.taxCents, totalCents: appointment.totalCents, currency: appointment.currency } });
    const invoice = await issueInvoice({ appointmentId: id, evidence, idempotencyKey: key, actor: user! });
    return NextResponse.json({ invoice });
  } catch (error) {
    return routeError(error);
  }
}

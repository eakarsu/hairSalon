import { NextRequest, NextResponse } from 'next/server';
import { authorizeAppointment, requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { approveChangeOrder, proposeChangeOrder } from '@/lib/field-service/workflow';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await authorizeAppointment(id, request.headers, { roles: ['OWNER', 'MANAGER', 'TECHNICIAN', 'FRONTDESK'] });
    const body = await request.json();
    const changeOrder = await proposeChangeOrder({ appointmentId: id, description: body.description, amountCents: body.amountCents, durationDeltaMinutes: body.durationDeltaMinutes, requestedBy: user!.id });
    return NextResponse.json({ changeOrder }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const key = requireIdempotencyKey(request.headers);
    const { user } = await authorizeAppointment(id, request.headers, { customerAllowed: true });
    const body = await request.json();
    const change = await prisma.changeOrder.findFirst({ where: { id: body.changeOrderId, appointmentId: id } });
    if (!change) return NextResponse.json({ error: 'Change order not found' }, { status: 404 });
    const taxEvidence = await callFieldProvider('TAX_QUOTE', { sourceRef: `change:${body.changeOrderId}`, idempotencyKey: `change-tax:${key}`, payload: { appointmentId: id, changeOrderId: body.changeOrderId, amountCents: body.amountCents } });
    const appointment = await approveChangeOrder({ changeOrderId: body.changeOrderId, approvedBy: user?.id || 'CUSTOMER', idempotencyKey: key, taxEvidence });
    return NextResponse.json({ appointment });
  } catch (error) {
    return routeError(error);
  }
}

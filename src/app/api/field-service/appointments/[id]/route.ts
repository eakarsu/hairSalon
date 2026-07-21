import { NextRequest, NextResponse } from 'next/server';
import { authorizeAppointment } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { appointment } = await authorizeAppointment(id, request.headers, { customerAllowed: true });
    const detail = await prisma.appointment.findUnique({ where: { id: appointment.id }, include: { service: true, technician: { select: { name: true } }, progressEntries: { orderBy: { sequence: 'asc' } }, changeOrders: { orderBy: { sequence: 'asc' } }, invoice: true, payment: { include: { refunds: true } }, events: { orderBy: { sequence: 'asc' }, select: { sequence: true, eventType: true, fromStatus: true, toStatus: true, occurredAt: true } } } });
    return NextResponse.json({ appointment: detail });
  } catch (error) {
    return routeError(error);
  }
}

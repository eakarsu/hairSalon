import { NextRequest, NextResponse } from 'next/server';
import { authorizeAppointment, requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { reassignTechnician } from '@/lib/field-service/workflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const key = requireIdempotencyKey(request.headers);
    const { user } = await authorizeAppointment(id, request.headers, { roles: ['OWNER', 'MANAGER', 'FRONTDESK'] });
    const body = await request.json();
    const appointment = await reassignTechnician({ appointmentId: id, technicianId: body.technicianId, actor: user!, idempotencyKey: key });
    return NextResponse.json({ appointment });
  } catch (error) {
    return routeError(error);
  }
}

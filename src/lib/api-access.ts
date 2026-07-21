import { getServerSession } from 'next-auth';
import type { UserRole } from '@prisma/client';
import { authOptions } from './auth';
import prisma from './prisma';
import { sha256 } from './field-service/canonical';

export class ApiAccessError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function requireActiveUser(roles?: UserRole[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new ApiAccessError('Unauthorized', 401);
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.active) throw new ApiAccessError('Unauthorized', 401);
  if (roles && !roles.includes(user.role)) throw new ApiAccessError('Insufficient permissions', 403);
  return user;
}

export function requireIdempotencyKey(headers: Headers): string {
  const key = headers.get('idempotency-key');
  if (!key || key.length > 200) throw new ApiAccessError('A valid Idempotency-Key header is required', 400);
  return key;
}

export async function authorizeAppointment(
  appointmentId: string,
  headers: Headers,
  options: { customerAllowed?: boolean; roles?: UserRole[] } = {}
) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw new ApiAccessError('Appointment not found', 404);
  const token = headers.get('x-appointment-access-token');
  if (options.customerAllowed && token && appointment.customerAccessTokenHash === sha256(token)) {
    return { appointment, user: null, actorRole: 'CUSTOMER' as const };
  }
  const user = await requireActiveUser(options.roles);
  if (user.salonId !== appointment.salonId) throw new ApiAccessError('Appointment not found', 404);
  return { appointment, user, actorRole: user.role };
}

export async function requireKiosk(headers: Headers, salonId?: string) {
  const token = headers.get('x-kiosk-token');
  if (!token) throw new ApiAccessError('Kiosk authentication required', 401);
  const device = await prisma.kioskDevice.findUnique({ where: { tokenHash: sha256(token) } });
  if (!device?.active || (salonId && device.salonId !== salonId)) throw new ApiAccessError('Kiosk authentication failed', 403);
  await prisma.kioskDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
  return device;
}

import type { AppointmentStatus, PaymentStatus } from '@prisma/client';

const transitions: Record<AppointmentStatus, ReadonlySet<AppointmentStatus>> = {
  QUOTED: new Set(['RESERVED', 'CANCELLED', 'EXCEPTION']),
  RESERVED: new Set(['BOOKED', 'CANCELLED', 'EXCEPTION']),
  BOOKED: new Set(['CONFIRMED', 'CANCELLED', 'EXCEPTION']),
  CONFIRMED: new Set(['DISPATCHED', 'IN_PROGRESS', 'NO_SHOW', 'CANCELLED', 'EXCEPTION']),
  DISPATCHED: new Set(['EN_ROUTE', 'IN_PROGRESS', 'CANCELLED', 'EXCEPTION']),
  EN_ROUTE: new Set(['IN_PROGRESS', 'CANCELLED', 'EXCEPTION']),
  IN_PROGRESS: new Set(['PARTIALLY_COMPLETED', 'COMPLETED', 'EXCEPTION']),
  PARTIALLY_COMPLETED: new Set(['IN_PROGRESS', 'COMPLETED', 'EXCEPTION']),
  COMPLETED: new Set(),
  NO_SHOW: new Set(),
  CANCELLED: new Set(),
  EXCEPTION: new Set(['RESERVED', 'BOOKED', 'CONFIRMED', 'DISPATCHED', 'EN_ROUTE', 'IN_PROGRESS']),
};

export function assertAppointmentTransition(from: AppointmentStatus, to: AppointmentStatus): void {
  if (!transitions[from]?.has(to)) throw new Error(`Invalid appointment transition ${from} -> ${to}`);
}

export function appointmentTimestamps(to: AppointmentStatus, now = new Date()): Record<string, Date> {
  if (to === 'DISPATCHED') return { dispatchedAt: now };
  if (to === 'EN_ROUTE') return { enRouteAt: now };
  if (to === 'IN_PROGRESS') return { workStartedAt: now };
  if (to === 'COMPLETED') return { completedAt: now };
  if (to === 'CANCELLED') return { cancelledAt: now };
  return {};
}

export function nextPaymentStatus(capturedCents: number, refundedCents: number): PaymentStatus {
  if (refundedCents < 0 || refundedCents > capturedCents) throw new Error('Refund exceeds captured payment');
  if (capturedCents === 0) return 'PENDING';
  if (refundedCents === 0) return 'COMPLETED';
  return refundedCents === capturedCents ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
}

import type { AppointmentStatus } from '@prisma/client';

export interface OfflineAppointmentCommand {
  salonId: string;
  appointmentId: string;
  deviceId: string;
  commandId: string;
  expectedVersion: number;
  toStatus: AppointmentStatus;
  note?: string;
}

export async function queueOfflineAppointmentCommand(command: OfflineAppointmentCommand): Promise<void> {
  if (!('serviceWorker' in navigator)) throw new Error('Offline recovery is not supported by this browser');
  const registration = await navigator.serviceWorker.ready;
  if (!registration.active) throw new Error('Service worker is not active');
  registration.active.postMessage({ type: 'QUEUE_APPOINTMENT_COMMAND', command });
}

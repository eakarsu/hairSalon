import type { Server as SocketIOServer } from 'socket.io';

type AppointmentEvent =
  | 'appointment:created'
  | 'appointment:updated'
  | 'appointment:cancelled';

function getIO(): SocketIOServer | null {
  return (global as unknown as Record<string, unknown>).__socketIO as SocketIOServer | null ?? null;
}

export function emitAppointmentEvent(
  salonId: string,
  event: AppointmentEvent,
  payload: unknown
) {
  const io = getIO();
  if (!io) return; // Socket.io not initialized (e.g. using next dev directly)
  io.to(`salon:${salonId}`).emit(event, payload);
}

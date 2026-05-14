import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type AppointmentEvent =
  | 'appointment:created'
  | 'appointment:updated'
  | 'appointment:cancelled';

type EventCallback = (data: unknown) => void;

interface AppointmentSocketHandlers {
  onCreated?: EventCallback;
  onUpdated?: EventCallback;
  onCancelled?: EventCallback;
}

/**
 * Connects to the Socket.io server and subscribes to real-time appointment events
 * for a given salon. Automatically cleans up on unmount.
 */
export function useAppointmentSocket(
  salonId: string | undefined,
  handlers: AppointmentSocketHandlers
) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!salonId) return;

    const socket = io(window.location.origin, {
      query: { salonId },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    const bind = (event: AppointmentEvent, cb?: EventCallback) => {
      if (!cb) return;
      socket.on(event, cb);
    };

    socket.on('connect', () => {
      bind('appointment:created', (data) => handlersRef.current.onCreated?.(data));
      bind('appointment:updated', (data) => handlersRef.current.onUpdated?.(data));
      bind('appointment:cancelled', (data) => handlersRef.current.onCancelled?.(data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [salonId]);
}

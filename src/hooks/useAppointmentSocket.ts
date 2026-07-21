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

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!salonId) return;

    let cancelled = false;

    fetch('/api/socket')
      .then(async (response) => {
        if (!response.ok) throw new Error('Socket authorization failed');
        return response.json();
      })
      .then(({ token }) => {
        if (cancelled) return;
        const socket = io(window.location.origin, { query: { salonId }, auth: { token }, transports: ['websocket', 'polling'] });
        socketRef.current = socket;
        const bind = (event: AppointmentEvent, cb?: EventCallback) => {
          if (cb) socket.on(event, cb);
        };
        socket.on('connect', () => {
          bind('appointment:created', (data) => handlersRef.current.onCreated?.(data));
          bind('appointment:updated', (data) => handlersRef.current.onUpdated?.(data));
          bind('appointment:cancelled', (data) => handlersRef.current.onCancelled?.(data));
        });
      })
      .catch((error) => console.error('Appointment socket unavailable:', error));

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [salonId]);
}

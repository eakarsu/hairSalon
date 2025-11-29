// Real-time notification utilities

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

// Check if notifications are supported and permitted
export function canSendNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Send a local notification
export function sendLocalNotification(payload: NotificationPayload): void {
  if (!canSendNotifications()) {
    console.log('Cannot send notification - not permitted');
    return;
  }

  const notification = new Notification(payload.title, {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    tag: payload.tag,
    data: payload.data,
  });

  notification.onclick = () => {
    window.focus();
    if (payload.data?.url) {
      window.location.href = payload.data.url as string;
    }
    notification.close();
  };
}

// Subscribe to push notifications
export async function subscribeToPush(salonId: string, userId?: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Get the server's VAPID public key
    const response = await fetch('/api/notifications/vapid-key');
    const { publicKey } = await response.json();

    if (!publicKey) {
      console.log('VAPID public key not configured');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Send subscription to server
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salonId,
        userId,
        subscription: subscription.toJSON(),
      }),
    });

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Notify server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Event source for real-time updates (SSE)
export class RealtimeConnection {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(private salonId: string) {}

  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    const url = `/api/notifications/stream?salonId=${this.salonId}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('[Realtime] Connected');
      this.reconnectAttempts = 0;
    };

    this.eventSource.onerror = () => {
      console.log('[Realtime] Connection error');
      this.handleReconnect();
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data.payload);
      } catch (error) {
        console.error('[Realtime] Error parsing message:', error);
      }
    };

    // Custom event types
    ['appointment', 'walkin', 'waitlist', 'checkin', 'payment'].forEach(type => {
      this.eventSource?.addEventListener(type, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(type, data);
        } catch (error) {
          console.error(`[Realtime] Error parsing ${type} event:`, error);
        }
      });
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[Realtime] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[Realtime] Reconnecting in ${delay}ms...`);
    setTimeout(() => this.connect(), delay);
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: unknown) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
    this.listeners.get('*')?.forEach(callback => callback({ type: event, data }));
  }
}

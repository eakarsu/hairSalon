import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

type SocketIdentity =
  | { kind: 'service' }
  | { kind: 'user'; userId: string; salonId: string };

function requiredSecret(name: string, minimumLength = 32): string {
  const value = process.env[name];
  if (!value || value.length < minimumLength) throw new Error(`${name} must contain at least ${minimumLength} characters`);
  return value;
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || process.env.NEXTAUTH_URL || (dev ? `http://${hostname}:${port}` : ''))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const socketSecret = requiredSecret('NEXTAUTH_SECRET');
if (!dev && ALLOWED_ORIGINS.length === 0) throw new Error('CORS_ORIGINS or NEXTAUTH_URL is required in production');

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin:
        ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Optional Redis adapter for horizontal scale (BeautyWellnes uses a custom Node server).
  // Activate by setting REDIS_URL. We lazy-import so the dep stays optional.
  if (process.env.REDIS_URL) {
    (async () => {
      try {
        // @ts-expect-error - optional dependency enabled only in scaled deployments
        const { createAdapter } = await import('@socket.io/redis-adapter');
        // @ts-expect-error - optional dependency enabled only in scaled deployments
        const { createClient } = await import('redis');
        const pubClient = createClient({ url: process.env.REDIS_URL });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log('> Socket.io Redis adapter attached');
      } catch (err) {
        console.warn(
          '> Redis adapter unavailable, continuing without horizontal scale:',
          err
        );
      }
    })();
  }

  // Authenticate every connection.
  // Accept a JWT (NextAuth-issued) via auth.token, or a server-shared SOCKET_AUTH_TOKEN
  // for trusted internal clients. Fall back to read-only if no auth (kiosks may use this).
  io.use((socket, next) => {
    try {
      const suppliedToken =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers['x-auth-token'];
      const token = Array.isArray(suppliedToken) ? suppliedToken[0] : suppliedToken;

      const sharedToken = process.env.SOCKET_AUTH_TOKEN;

      if (!token) {
        return next(new Error('UNAUTHORIZED'));
      }

      if (sharedToken && token === sharedToken) {
        (socket.data as { auth?: SocketIdentity }).auth = { kind: 'service' };
        return next();
      }

      try {
        const decoded = jwt.verify(String(token), socketSecret, { algorithms: ['HS256'], audience: 'salonflow-socket' });
        if (typeof decoded === 'string' || typeof decoded.salonId !== 'string') return next(new Error('UNAUTHORIZED'));
        const userId = typeof decoded.userId === 'string' ? decoded.userId : decoded.sub;
        if (!userId) return next(new Error('UNAUTHORIZED'));
        (socket.data as { auth?: SocketIdentity }).auth = {
          kind: 'user',
          userId,
          salonId: decoded.salonId,
        };
        return next();
      } catch {
        return next(new Error('UNAUTHORIZED'));
      }
    } catch (err) {
      return next(err as Error);
    }
  });

  // Store io on global so API routes can emit events
  (global as unknown as Record<string, unknown>).__socketIO = io;

  io.on('connection', (socket) => {
    const salonId = socket.handshake.query.salonId as string;
    const auth = (socket.data as { auth?: SocketIdentity }).auth;

    // Authorize room join: user must be tied to that salonId; service tokens may join any.
    if (salonId) {
      const allowed =
        auth?.kind === 'service' ||
        (auth?.kind === 'user' && auth.salonId === salonId) ||
        false;
      if (allowed) {
        socket.join(`salon:${salonId}`);
      } else {
        socket.emit('unauthorized', { reason: 'salonId mismatch' });
      }
    }

    socket.on('disconnect', () => {
      // cleanup if needed
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

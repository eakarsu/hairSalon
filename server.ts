import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const ALLOWED_ORIGINS = (
  process.env.CORS_ORIGINS ||
  process.env.NEXTAUTH_URL ||
  `http://${hostname}:${port}`
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

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
        ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.length === 0
          ? '*'
          : ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Optional Redis adapter for horizontal scale (BeautyWellnes uses a custom Node server).
  // Activate by setting REDIS_URL. We lazy-import so the dep stays optional.
  if (process.env.REDIS_URL) {
    (async () => {
      try {
        // @ts-ignore - optional dep
        const { createAdapter } = await import('@socket.io/redis-adapter');
        // @ts-ignore - optional dep
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
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers['x-auth-token'];

      const sharedToken = process.env.SOCKET_AUTH_TOKEN;
      const secret = process.env.NEXTAUTH_SECRET || 'your-secret-key';

      if (!token) {
        // Mark unauthenticated; only public read events allowed.
        (socket.data as any).auth = { kind: 'guest' };
        return next();
      }

      if (sharedToken && token === sharedToken) {
        (socket.data as any).auth = { kind: 'service' };
        return next();
      }

      try {
        const decoded: any = jwt.verify(token as string, secret);
        (socket.data as any).auth = {
          kind: 'user',
          userId: decoded.userId || decoded.sub,
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
    const auth = (socket.data as any).auth;

    // Authorize room join: user must be tied to that salonId; service tokens may join any.
    if (salonId) {
      const allowed =
        auth?.kind === 'service' ||
        (auth?.kind === 'user' && auth.salonId === salonId) ||
        // Guests get a public read-only room
        (auth?.kind === 'guest' && socket.handshake.query.public === 'true');
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

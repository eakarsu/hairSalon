import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { requireActiveUser } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';

/**
 * Socket.IO is initialized in server.ts (custom Node.js server).
 * This route is a health-check endpoint so clients can confirm the
 * WebSocket server is reachable before connecting via socket.io-client.
 */
export async function GET() {
  try {
    const user = await requireActiveUser();
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret || secret.length < 32) throw new Error('NEXTAUTH_SECRET is not configured');
    const token = jwt.sign({ userId: user.id, salonId: user.salonId }, secret, { algorithm: 'HS256', audience: 'salonflow-socket', expiresIn: '5m' });
    return NextResponse.json({ token, salonId: user.salonId });
  } catch (error) {
    return routeError(error);
  }
}

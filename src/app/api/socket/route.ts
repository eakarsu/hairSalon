import { NextResponse } from 'next/server';

/**
 * Socket.IO is initialized in server.ts (custom Node.js server).
 * This route is a health-check endpoint so clients can confirm the
 * WebSocket server is reachable before connecting via socket.io-client.
 */
export async function GET() {
  const io = (global as unknown as Record<string, unknown>).__socketIO;
  return NextResponse.json({
    ok: true,
    socketReady: !!io,
  });
}

import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveUser } from '@/lib/api-access';
import { sha256 } from '@/lib/field-service/canonical';
import { routeError } from '@/lib/route-error';

export async function GET() {
  try {
    const user = await requireActiveUser(['OWNER', 'MANAGER']);
    const devices = await prisma.kioskDevice.findMany({
      where: { salonId: user.salonId },
      select: { id: true, name: true, active: true, lastSeenAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ devices });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser(['OWNER', 'MANAGER']);
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name || name.length > 120) return NextResponse.json({ error: 'A valid device name is required' }, { status: 400 });
    const token = randomBytes(32).toString('base64url');
    const device = await prisma.kioskDevice.create({
      data: { salonId: user.salonId, name, tokenHash: sha256(token) },
      select: { id: true, name: true, active: true, createdAt: true },
    });
    // The raw credential is deliberately returned once and never persisted.
    return NextResponse.json({ device, token }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireActiveUser(['OWNER', 'MANAGER']);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Device id is required' }, { status: 400 });
    const result = await prisma.kioskDevice.updateMany({ where: { id, salonId: user.salonId }, data: { active: false } });
    if (!result.count) return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return routeError(error);
  }
}

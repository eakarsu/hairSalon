import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const entry = await prisma.waitlist.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'NOTIFIED') {
        updateData.notifiedAt = new Date();
      } else if (status === 'SEATED') {
        updateData.seatedAt = new Date();
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await prisma.waitlist.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('Waitlist update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const entry = await prisma.waitlist.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.waitlist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Waitlist delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

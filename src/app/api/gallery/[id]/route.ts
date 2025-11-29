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
    const { title, description, tags, featured } = body;

    const photo = await prisma.galleryPhoto.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const updated = await prisma.galleryPhoto.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(tags !== undefined && { tags }),
        ...(featured !== undefined && { featured }),
      },
      include: {
        technician: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ photo: updated });
  } catch (error) {
    console.error('Gallery update error:', error);
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

    const photo = await prisma.galleryPhoto.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    await prisma.galleryPhoto.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gallery delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

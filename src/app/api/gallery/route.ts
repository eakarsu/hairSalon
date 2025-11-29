import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get('technicianId');
    const featured = searchParams.get('featured');
    const tag = searchParams.get('tag');

    const where: Record<string, unknown> = {
      salonId: session.user.salonId,
    };

    if (technicianId) {
      where.technicianId = technicianId;
    }

    if (featured === 'true') {
      where.featured = true;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const photos = await prisma.galleryPhoto.findMany({
      where,
      include: {
        technician: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Gallery fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, thumbnailUrl, title, description, tags, technicianId, visitId, featured } = body;

    if (!imageUrl || !technicianId) {
      return NextResponse.json({ error: 'Image URL and technician are required' }, { status: 400 });
    }

    const photo = await prisma.galleryPhoto.create({
      data: {
        salonId: session.user.salonId,
        technicianId,
        imageUrl,
        thumbnailUrl: thumbnailUrl || null,
        title: title || null,
        description: description || null,
        tags: tags || [],
        visitId: visitId || null,
        featured: featured || false,
      },
      include: {
        technician: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ photo });
  } catch (error) {
    console.error('Gallery create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

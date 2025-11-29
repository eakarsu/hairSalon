import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const serviceId = searchParams.get('serviceId');

    // For public access (booking page)
    if (salonId) {
      const addons = await prisma.serviceAddon.findMany({
        where: {
          salonId,
          active: true,
          ...(serviceId && { serviceId }),
        },
        include: {
          service: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({ addons });
    }

    // For authenticated access
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const addons = await prisma.serviceAddon.findMany({
      where: {
        salonId: session.user.salonId,
        ...(serviceId && { serviceId }),
      },
      include: {
        service: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ addons });
  } catch (error) {
    console.error('Get service addons error:', error);
    return NextResponse.json({ error: 'Failed to get service addons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serviceId, name, description, price, duration } = await request.json();

    if (!serviceId || !name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify service belongs to salon
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service || service.salonId !== session.user.salonId) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const addon = await prisma.serviceAddon.create({
      data: {
        salonId: session.user.salonId,
        serviceId,
        name,
        description,
        price,
        duration: duration || 0,
      },
      include: {
        service: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ addon });
  } catch (error) {
    console.error('Create service addon error:', error);
    return NextResponse.json({ error: 'Failed to create service addon' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Addon ID is required' }, { status: 400 });
    }

    const existing = await prisma.serviceAddon.findUnique({
      where: { id },
    });

    if (!existing || existing.salonId !== session.user.salonId) {
      return NextResponse.json({ error: 'Service addon not found' }, { status: 404 });
    }

    const addon = await prisma.serviceAddon.update({
      where: { id },
      data: updates,
      include: {
        service: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ addon });
  } catch (error) {
    console.error('Update service addon error:', error);
    return NextResponse.json({ error: 'Failed to update service addon' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Addon ID is required' }, { status: 400 });
    }

    const existing = await prisma.serviceAddon.findUnique({
      where: { id },
    });

    if (!existing || existing.salonId !== session.user.salonId) {
      return NextResponse.json({ error: 'Service addon not found' }, { status: 404 });
    }

    await prisma.serviceAddon.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete service addon error:', error);
    return NextResponse.json({ error: 'Failed to delete service addon' }, { status: 500 });
  }
}

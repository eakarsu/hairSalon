import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await prisma.service.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error('Service fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the service belongs to the user's salon
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, category, durationMinutes, basePrice, active } = body;

    const service = await prisma.service.update({
      where: { id },
      data: {
        name: name ?? existingService.name,
        description: description ?? existingService.description,
        category: category ?? existingService.category,
        durationMinutes: durationMinutes !== undefined ? parseInt(durationMinutes) : existingService.durationMinutes,
        basePrice: basePrice !== undefined ? parseFloat(basePrice) : existingService.basePrice,
        active: active !== undefined ? active : existingService.active,
      },
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error('Service update error:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the service belongs to the user's salon
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Service delete error:', error);
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
  }
}

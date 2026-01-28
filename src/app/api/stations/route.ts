import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stations = await prisma.station.findMany({
      where: { salonId: session.user.salonId, active: true },
      include: {
        assignments: {
          include: {
            technician: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get station types for filtering
    const types = [...new Set(stations.map(s => s.type).filter(Boolean))];

    return NextResponse.json({ stations, types });
  } catch (error) {
    console.error('Failed to fetch stations:', error);
    return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type } = body;

    const station = await prisma.station.create({
      data: {
        salonId: session.user.salonId,
        name,
        type,
      },
    });

    return NextResponse.json({ station });
  } catch (error) {
    console.error('Failed to create station:', error);
    return NextResponse.json({ error: 'Failed to create station' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, type, assignments } = body;

    // Update station
    const station = await prisma.station.update({
      where: { id, salonId: session.user.salonId },
      data: { name, type },
    });

    // Update assignments if provided
    if (assignments) {
      // Delete existing assignments
      await prisma.stationAssignment.deleteMany({
        where: { stationId: id },
      });

      // Create new assignments
      if (assignments.length > 0) {
        await prisma.stationAssignment.createMany({
          data: assignments.map((a: { technicianId: string; dayOfWeek?: number; startTime?: string; endTime?: string }) => ({
            stationId: id,
            technicianId: a.technicianId,
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
          })),
        });
      }
    }

    // Fetch updated station with assignments
    const updated = await prisma.station.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            technician: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ station: updated });
  } catch (error) {
    console.error('Failed to update station:', error);
    return NextResponse.json({ error: 'Failed to update station' }, { status: 500 });
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
      return NextResponse.json({ error: 'Station ID required' }, { status: 400 });
    }

    await prisma.station.update({
      where: { id, salonId: session.user.salonId },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete station:', error);
    return NextResponse.json({ error: 'Failed to delete station' }, { status: 500 });
  }
}

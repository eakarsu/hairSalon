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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const technicianId = searchParams.get('technicianId');

    const where: Record<string, unknown> = { salonId: session.user.salonId };
    if (status) where.status = status;
    if (technicianId) where.technicianId = technicianId;

    const requests = await prisma.timeOffRequest.findMany({
      where,
      include: {
        technician: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      pending: requests.filter(r => r.status === 'PENDING').length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      denied: requests.filter(r => r.status === 'DENIED').length,
    };

    return NextResponse.json({ requests, summary });
  } catch (error) {
    console.error('Failed to fetch time-off requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { technicianId, startDate, endDate, reason } = body;

    const timeOffRequest = await prisma.timeOffRequest.create({
      data: {
        salonId: session.user.salonId,
        technicianId: technicianId || session.user.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: 'PENDING',
      },
      include: {
        technician: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ request: timeOffRequest });
  } catch (error) {
    console.error('Failed to create time-off request:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    const timeOffRequest = await prisma.timeOffRequest.update({
      where: { id, salonId: session.user.salonId },
      data: {
        status,
        approvedById: status === 'APPROVED' || status === 'DENIED' ? session.user.id : undefined,
        approvedAt: status === 'APPROVED' || status === 'DENIED' ? new Date() : undefined,
      },
      include: {
        technician: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ request: timeOffRequest });
  } catch (error) {
    console.error('Failed to update time-off request:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
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
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    await prisma.timeOffRequest.delete({
      where: { id, salonId: session.user.salonId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete time-off request:', error);
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 });
  }
}

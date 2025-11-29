import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      where: { salonId: session.user.salonId },
      include: {
        assignedTo: { select: { name: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    return NextResponse.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        type: t.type,
        status: t.status,
        dueDate: t.dueDate,
        assignedToName: t.assignedTo?.name || null,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    console.log('Task API - Session:', JSON.stringify(session, null, 2));

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify salon exists
    const salon = await prisma.salon.findUnique({
      where: { id: session.user.salonId },
    });

    console.log('Task API - Salon exists:', !!salon, 'ID:', session.user.salonId);

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found - please log out and log back in' }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, type, status, dueDate, assignedToId } = body;

    console.log('Task API - Body:', JSON.stringify(body, null, 2));
    console.log('Task API - assignedToId:', assignedToId, 'type:', typeof assignedToId);

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Only set assignedToUserId if it's a valid non-empty string
    const validAssignedToId = assignedToId && assignedToId.trim() !== '' ? assignedToId : null;

    const task = await prisma.task.create({
      data: {
        salonId: session.user.salonId,
        title,
        description: description || null,
        type: type || 'OTHER',
        status: status || 'OPEN',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToUserId: validAssignedToId,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Task create error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

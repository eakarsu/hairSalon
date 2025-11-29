import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staff = await prisma.user.findMany({
      where: { salonId: session.user.salonId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        preferredLanguage: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Staff fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners and managers can add staff
    if (!['OWNER', 'MANAGER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, role, preferredLanguage, active } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    // Create user with default password
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.create({
      data: {
        salonId: session.user.salonId,
        name,
        email,
        phone: phone || null,
        role,
        preferredLanguage: preferredLanguage || 'en',
        active: active ?? true,
        hashedPassword,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Staff create error:', error);
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 });
  }
}

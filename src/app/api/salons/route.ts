import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get all salons for multi-salon owners
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can view multiple salons
    if (session.user.role !== 'OWNER') {
      // Return just their current salon
      const salon = await prisma.salon.findUnique({
        where: { id: session.user.salonId },
        include: {
          _count: {
            select: {
              users: true,
              clients: true,
              appointments: true,
            },
          },
        },
      });

      return NextResponse.json({ salons: salon ? [salon] : [] });
    }

    // For owners, get all salons they own (by email match or explicit ownership)
    // In a full implementation, you'd have a SalonOwner junction table
    const salons = await prisma.salon.findMany({
      where: {
        users: {
          some: {
            email: session.user.email,
            role: 'OWNER',
          },
        },
      },
      include: {
        _count: {
          select: {
            users: true,
            clients: true,
            appointments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ salons });
  } catch (error) {
    console.error('Get salons error:', error);
    return NextResponse.json({ error: 'Failed to get salons' }, { status: 500 });
  }
}

// Create a new salon (for multi-salon expansion)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can create new salons
    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can create new salons' }, { status: 403 });
    }

    const { name, address, phone, email, timezone, primaryLanguage } = await request.json();

    if (!name || !address || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the new salon
    const salon = await prisma.salon.create({
      data: {
        name,
        address,
        phone,
        email,
        timezone: timezone || 'America/New_York',
        primaryLanguage: primaryLanguage || 'en',
      },
    });

    // Create an owner user for this salon (linked to the current user's email)
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (currentUser) {
      await prisma.user.create({
        data: {
          salonId: salon.id,
          name: currentUser.name,
          email: `${currentUser.email.split('@')[0]}+${salon.id.slice(0, 8)}@${currentUser.email.split('@')[1]}`,
          hashedPassword: currentUser.hashedPassword,
          role: 'OWNER',
          phone: currentUser.phone,
        },
      });
    }

    // Create default booking settings
    await prisma.bookingSettings.create({
      data: {
        salonId: salon.id,
      },
    });

    return NextResponse.json({ salon });
  } catch (error) {
    console.error('Create salon error:', error);
    return NextResponse.json({ error: 'Failed to create salon' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Switch active salon for multi-salon users
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetSalonId } = await request.json();

    if (!targetSalonId) {
      return NextResponse.json({ error: 'Target salon ID is required' }, { status: 400 });
    }

    // Verify user has access to target salon
    const userInTargetSalon = await prisma.user.findFirst({
      where: {
        email: session.user.email,
        salonId: targetSalonId,
      },
      include: {
        salon: true,
      },
    });

    if (!userInTargetSalon) {
      return NextResponse.json({ error: 'You do not have access to this salon' }, { status: 403 });
    }

    // Return the user info for the target salon
    // The client will update the session with this info
    return NextResponse.json({
      success: true,
      user: {
        id: userInTargetSalon.id,
        name: userInTargetSalon.name,
        email: userInTargetSalon.email,
        role: userInTargetSalon.role,
        salonId: userInTargetSalon.salonId,
        salon: {
          id: userInTargetSalon.salon.id,
          name: userInTargetSalon.salon.name,
        },
      },
    });
  } catch (error) {
    console.error('Switch salon error:', error);
    return NextResponse.json({ error: 'Failed to switch salon' }, { status: 500 });
  }
}

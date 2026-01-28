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
    const technicianId = searchParams.get('technicianId');

    const where: Record<string, unknown> = { salonId: session.user.salonId };
    if (technicianId) where.technicianId = technicianId;

    const skills = await prisma.technicianSkill.findMany({
      where,
      include: {
        technician: { select: { id: true, name: true, level: true } },
      },
      orderBy: [{ technicianId: 'asc' }, { skillName: 'asc' }],
    });

    // Group by technician for summary
    const byTechnician = skills.reduce((acc, skill) => {
      const techId = skill.technicianId;
      if (!acc[techId]) {
        acc[techId] = {
          technician: skill.technician,
          skills: [],
          certifiedCount: 0,
          expiringCerts: 0,
        };
      }
      acc[techId].skills.push(skill);
      if (skill.certified) acc[techId].certifiedCount++;
      if (skill.certExpiry && new Date(skill.certExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
        acc[techId].expiringCerts++;
      }
      return acc;
    }, {} as Record<string, { technician: { id: string; name: string; level: string | null }; skills: typeof skills; certifiedCount: number; expiringCerts: number }>);

    return NextResponse.json({ skills, byTechnician: Object.values(byTechnician) });
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { technicianId, skillName, level, certified, certExpiry, notes } = body;

    const skill = await prisma.technicianSkill.create({
      data: {
        salonId: session.user.salonId,
        technicianId,
        skillName,
        level: level || 'INTERMEDIATE',
        certified: certified || false,
        certExpiry: certExpiry ? new Date(certExpiry) : null,
        notes,
      },
      include: {
        technician: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ skill });
  } catch (error) {
    console.error('Failed to create skill:', error);
    return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, level, certified, certExpiry, notes } = body;

    const skill = await prisma.technicianSkill.update({
      where: { id, salonId: session.user.salonId },
      data: {
        level,
        certified,
        certExpiry: certExpiry ? new Date(certExpiry) : null,
        notes,
      },
      include: {
        technician: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ skill });
  } catch (error) {
    console.error('Failed to update skill:', error);
    return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 });
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
      return NextResponse.json({ error: 'Skill ID required' }, { status: 400 });
    }

    await prisma.technicianSkill.delete({
      where: { id, salonId: session.user.salonId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete skill:', error);
    return NextResponse.json({ error: 'Failed to delete skill' }, { status: 500 });
  }
}

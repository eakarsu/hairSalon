import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { requireActiveUser } from '@/lib/api-access';
import { sha256 } from '@/lib/field-service/canonical';
import { sendEmail } from '@/lib/email';
import { routeError } from '@/lib/route-error';

export async function GET() {
  try {
    const currentUser = await requireActiveUser();

    const staff = await prisma.user.findMany({
      where: { salonId: currentUser.salonId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        preferredLanguage: true,
        level: true,
        staffSchedules: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, isWorking: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireActiveUser(['OWNER', 'MANAGER']);

    const body = await request.json();
    const { name, email, phone, role, preferredLanguage, active } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 });
    }
    if (!['MANAGER', 'TECHNICIAN', 'FRONTDESK'].includes(role) || (role === 'MANAGER' && currentUser.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Requested staff role is not permitted' }, { status: 403 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const inviteToken = randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomBytes(32).toString('base64url'), 12);

    const user = await prisma.user.create({
      data: {
        salonId: currentUser.salonId,
        name,
        email,
        phone: phone || null,
        role,
        preferredLanguage: preferredLanguage || 'en',
        active: active ?? true,
        hashedPassword,
        passwordResetToken: sha256(inviteToken),
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        emailVerified: true,
      },
      select: { id: true, name: true, email: true, phone: true, role: true, active: true, preferredLanguage: true },
    });

    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) throw new Error('NEXTAUTH_URL is not configured');
    const result = await sendEmail({ to: user.email, salonId: currentUser.salonId, subject: 'Your SalonFlow staff invitation', body: `Set your password within 24 hours: ${baseUrl}/reset-password?token=${encodeURIComponent(inviteToken)}` });
    if (!result.success) {
      await prisma.user.delete({ where: { id: user.id } });
      throw new Error(`Staff invitation delivery failed: ${result.error}`);
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

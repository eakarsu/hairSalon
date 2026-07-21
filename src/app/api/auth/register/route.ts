import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sha256 } from '@/lib/field-service/canonical';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phone, salonId, preferredLanguage } = body;

    if (!name || !email || !password || !salonId) {
      return NextResponse.json(
        { error: 'Name, email, password, and salonId are required' },
        { status: 400 }
      );
    }

    // Password strength validation
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain an uppercase letter' }, { status: 400 });
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain a lowercase letter' }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain a number' }, { status: 400 });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain a special character' }, { status: 400 });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Verify salon exists
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    const hashedPassword = await hash(password, 12);
    const emailVerifyToken = randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        hashedPassword,
        phone: phone || null,
        salonId,
        role: 'CLIENT_USER',
        preferredLanguage: preferredLanguage || 'en',
        emailVerifyToken: sha256(emailVerifyToken),
        emailVerified: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) throw new Error('NEXTAUTH_URL is not configured');
    const emailResult = await sendEmail({ to: user.email, salonId, subject: 'Verify your SalonFlow email', body: `Verify your account: ${baseUrl}/verify-email?token=${encodeURIComponent(emailVerifyToken)}` });
    if (!emailResult.success) throw new Error(`Verification email failed: ${emailResult.error}`);

    return NextResponse.json({
      message: 'User registered successfully. Please verify your email.',
      user,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}

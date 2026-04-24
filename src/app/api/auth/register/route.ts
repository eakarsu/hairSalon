import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phone, salonId, role, preferredLanguage } = body;

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
    const emailVerifyToken = uuidv4();

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        hashedPassword,
        phone: phone || null,
        salonId,
        role: role || 'FRONTDESK',
        preferredLanguage: preferredLanguage || 'en',
        emailVerifyToken,
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

    return NextResponse.json({
      message: 'User registered successfully. Please verify your email.',
      user,
      emailVerifyToken,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}

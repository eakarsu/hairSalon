import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sha256 } from '@/lib/field-service/canonical';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: sha256(resetToken),
        passwordResetExpires: resetExpires,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) throw new Error('NEXTAUTH_URL is not configured');
    const result = await sendEmail({ to: user.email, salonId: user.salonId, subject: 'Reset your SalonFlow password', body: `Use this link within one hour to reset your password: ${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}` });
    if (!result.success) throw new Error(`Password reset email failed: ${result.error}`);

    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

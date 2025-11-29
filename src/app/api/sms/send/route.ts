import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { twilioClient } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, message, type } = body;

    if (!to || !message) {
      return NextResponse.json({ error: 'Recipient and message required' }, { status: 400 });
    }

    // Send SMS
    const result = await twilioClient.sendSMS({
      to,
      message,
      salonId: session.user.salonId,
    });

    // Log the SMS
    await prisma.sMSLog.create({
      data: {
        salonId: session.user.salonId,
        toPhone: to,
        fromPhone: process.env.TWILIO_PHONE_NUMBER || 'not-configured',
        message,
        twilioSid: result.sid || null,
        status: result.success ? 'sent' : 'failed',
        errorCode: result.error || null,
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'SMS failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

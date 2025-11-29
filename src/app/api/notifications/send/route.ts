import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@nailflow.ai',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, userId, tag, data } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    // Get active subscriptions
    const subscriptions = await prisma.notificationSubscription.findMany({
      where: {
        salonId: session.user.salonId,
        type: 'PUSH',
        active: true,
        ...(userId && { userId }),
      },
    });

    const payload = JSON.stringify({
      title,
      body,
      tag: tag || 'notification',
      data: data || {},
    });

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send to all subscriptions
    for (const sub of subscriptions) {
      const metadata = sub.metadata as { keys?: { p256dh: string; auth: string } };

      if (!metadata?.keys) {
        results.failed++;
        continue;
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: metadata.keys,
          },
          payload
        );
        results.sent++;
      } catch (error: unknown) {
        results.failed++;

        // If subscription is invalid, deactivate it
        const err = error as { statusCode?: number };
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.notificationSubscription.update({
            where: { id: sub.id },
            data: { active: false },
          });
        }

        results.errors.push(String(error));
      }
    }

    return NextResponse.json({
      success: true,
      totalSubscriptions: subscriptions.length,
      ...results,
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}

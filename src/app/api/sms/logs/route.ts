import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {
      salonId: session.user.salonId,
    };

    if (status) {
      where.status = status;
    }

    const logs = await prisma.sMSLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get summary stats
    const [sent, failed] = await Promise.all([
      prisma.sMSLog.count({
        where: { salonId: session.user.salonId, status: 'sent' },
      }),
      prisma.sMSLog.count({
        where: { salonId: session.user.salonId, status: 'failed' },
      }),
    ]);

    return NextResponse.json({
      logs,
      summary: {
        sent,
        failed,
        total: sent + failed,
      },
    });
  } catch (error) {
    console.error('SMS logs fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

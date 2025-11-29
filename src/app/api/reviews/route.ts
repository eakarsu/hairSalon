import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const rating = searchParams.get('rating');
    const responded = searchParams.get('responded');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where = {
      salonId: session.user.salonId,
      ...(platform && { platform: platform as 'GOOGLE' | 'YELP' | 'INTERNAL' | 'FACEBOOK' }),
      ...(rating && { rating: parseInt(rating) }),
      ...(responded === 'true' && { response: { not: null } }),
      ...(responded === 'false' && { response: null }),
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true },
          },
          appointment: {
            select: {
              id: true,
              startTime: true,
              service: { select: { name: true } },
              technician: { select: { name: true } },
            },
          },
        },
        orderBy: { reviewDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    // Calculate stats
    const stats = await prisma.review.groupBy({
      by: ['rating'],
      where: { salonId: session.user.salonId },
      _count: { rating: true },
    });

    const allReviews = await prisma.review.aggregate({
      where: { salonId: session.user.salonId },
      _avg: { rating: true },
      _count: { id: true },
    });

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        averageRating: allReviews._avg.rating || 0,
        totalReviews: allReviews._count.id,
        ratingBreakdown: stats.reduce((acc, s) => {
          acc[s.rating] = s._count.rating;
          return acc;
        }, {} as Record<number, number>),
      },
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json({ error: 'Failed to get reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, appointmentId, platform, rating, content, externalId, reviewDate } = await request.json();

    if (!platform || !rating) {
      return NextResponse.json({ error: 'Platform and rating are required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Check for duplicate external ID
    if (externalId) {
      const existing = await prisma.review.findFirst({
        where: { salonId: session.user.salonId, externalId },
      });
      if (existing) {
        return NextResponse.json({ error: 'Review with this external ID already exists' }, { status: 409 });
      }
    }

    const review = await prisma.review.create({
      data: {
        salonId: session.user.salonId,
        clientId,
        appointmentId,
        platform,
        rating,
        content,
        externalId,
        reviewDate: reviewDate ? new Date(reviewDate) : new Date(),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

// Respond to a review
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, response } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    const existing = await prisma.review.findUnique({
      where: { id },
    });

    if (!existing || existing.salonId !== session.user.salonId) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const review = await prisma.review.update({
      where: { id },
      data: {
        response,
        respondedAt: response ? new Date() : null,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Update review response error:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

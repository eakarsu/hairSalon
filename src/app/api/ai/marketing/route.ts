import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import openRouterClient from '@/lib/openRouterClient';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      contentType,
      topic,
      targetAudience,
      tone,
      keyPoints,
      callToAction,
      characterLimit,
    } = await request.json();

    if (!contentType || !topic) {
      return NextResponse.json({ error: 'Content type and topic are required' }, { status: 400 });
    }

    // Validate content type
    const validTypes = ['social_post', 'email_campaign', 'promo_sms', 'newsletter'];
    if (!validTypes.includes(contentType)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    // Get salon info for context
    const salon = await prisma.salon.findUnique({
      where: { id: session.user.salonId },
    });

    // Generate marketing copy
    const content = await openRouterClient.generateMarketingCopy({
      contentType,
      topic: `${topic} (Salon: ${salon?.name || 'Nail Salon'})`,
      targetAudience: targetAudience || 'existing clients',
      tone: tone || 'friendly and professional',
      keyPoints: keyPoints || [],
      callToAction: callToAction || 'Book your appointment today!',
      characterLimit,
    });

    // Log to AI audit
    await prisma.aIAuditLog.create({
      data: {
        salonId: session.user.salonId,
        contextType: 'MARKETING',
        inputSummary: `${contentType}: ${topic}`,
        outputSummary: content.substring(0, 500),
      },
    });

    return NextResponse.json({
      content,
      contentType,
      topic,
    });
  } catch (error) {
    console.error('AI Marketing error:', error);
    return NextResponse.json({ error: 'Failed to generate marketing content' }, { status: 500 });
  }
}

// Get content suggestions/templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return common marketing templates and suggestions
    const templates = {
      social_post: [
        {
          topic: 'New Service Launch',
          keyPoints: ['service name', 'benefits', 'introductory pricing'],
          callToAction: 'Book now to try it first!',
        },
        {
          topic: 'Seasonal Special',
          keyPoints: ['seasonal theme', 'limited time offer', 'discount percentage'],
          callToAction: 'Limited spots available - book today!',
        },
        {
          topic: 'Client Appreciation',
          keyPoints: ['thank you message', 'loyalty rewards', 'referral bonus'],
          callToAction: 'Share the love with your friends!',
        },
        {
          topic: 'Before & After Showcase',
          keyPoints: ['transformation story', 'service details', 'technician name'],
          callToAction: 'Want this look? Book with us!',
        },
      ],
      email_campaign: [
        {
          topic: 'Monthly Newsletter',
          keyPoints: ['new arrivals', 'staff updates', 'upcoming events', 'special offers'],
          callToAction: 'Book your next appointment',
        },
        {
          topic: 'Win-Back Campaign',
          keyPoints: ['we miss you', 'special comeback offer', 'new services'],
          callToAction: 'Come back and save 20%',
        },
        {
          topic: 'Holiday Promotion',
          keyPoints: ['holiday greeting', 'gift card promotion', 'special packages'],
          callToAction: 'Gift the gift of beauty',
        },
      ],
      promo_sms: [
        {
          topic: 'Flash Sale',
          keyPoints: ['discount amount', 'valid dates', 'code'],
          callToAction: 'Book now!',
          characterLimit: 160,
        },
        {
          topic: 'Last-Minute Opening',
          keyPoints: ['available time', 'discount for today'],
          callToAction: 'Reply YES to book',
          characterLimit: 160,
        },
      ],
      newsletter: [
        {
          topic: 'Monthly Digest',
          keyPoints: ['featured services', 'team spotlight', 'client testimonials', 'tips & trends'],
          callToAction: 'Schedule your next visit',
        },
      ],
    };

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Get marketing templates error:', error);
    return NextResponse.json({ error: 'Failed to get templates' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await prisma.client.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
      include: {
        preferredTech: { select: { name: true } },
        loyaltyAccount: { select: { pointsBalance: true, tier: true } },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Client fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the client belongs to the user's salon
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, phone, email, preferredLanguage, marketingOptIn, notes, birthday } = body;

    const client = await prisma.client.update({
      where: { id },
      data: {
        name: name ?? existingClient.name,
        phone: phone ?? existingClient.phone,
        email: email || null,
        preferredLanguage: preferredLanguage ?? existingClient.preferredLanguage,
        marketingOptIn: marketingOptIn !== undefined ? marketingOptIn : existingClient.marketingOptIn,
        notes: notes || null,
        birthday: birthday ? new Date(birthday) : existingClient.birthday,
      },
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Client update error:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the client belongs to the user's salon
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Client delete error:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}

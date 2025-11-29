import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Inventory item fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const { name, sku, category, minQuantity, costPrice, retailPrice, supplier, active } = body;

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sku !== undefined && { sku }),
        ...(category !== undefined && { category }),
        ...(minQuantity !== undefined && { minQuantity }),
        ...(costPrice !== undefined && { costPrice }),
        ...(retailPrice !== undefined && { retailPrice }),
        ...(supplier !== undefined && { supplier }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error('Inventory update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Soft delete by setting active to false
    await prisma.inventoryItem.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inventory delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

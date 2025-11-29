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
    const category = searchParams.get('category');
    const lowStock = searchParams.get('lowStock');

    const where: Record<string, unknown> = {
      salonId: session.user.salonId,
      active: true,
    };

    if (category) {
      where.category = category;
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Filter low stock if requested
    const filteredItems = lowStock === 'true'
      ? items.filter((item) => item.quantity <= item.minQuantity)
      : items;

    return NextResponse.json({ items: filteredItems });
  } catch (error) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, sku, category, quantity, minQuantity, costPrice, retailPrice, supplier } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
    }

    const item = await prisma.inventoryItem.create({
      data: {
        salonId: session.user.salonId,
        name,
        sku: sku || null,
        category,
        quantity: quantity || 0,
        minQuantity: minQuantity || 5,
        costPrice: costPrice || null,
        retailPrice: retailPrice || null,
        supplier: supplier || null,
      },
    });

    // Create initial transaction if quantity > 0
    if (quantity > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          inventoryItemId: item.id,
          quantityChange: quantity,
          reason: 'Initial stock',
          performedBy: session.user.name,
        },
      });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Inventory create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

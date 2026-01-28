import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const lowStock = searchParams.get('lowStock') === 'true';

    const where: Record<string, unknown> = {
      salonId: session.user.salonId,
      active: true,
    };
    if (category) where.category = category;

    const products = await prisma.retailProduct.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Filter low stock if requested
    const filtered = lowStock
      ? products.filter(p => p.quantity <= p.minQuantity)
      : products;

    // Get categories for filter
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    return NextResponse.json({ products: filtered, categories });
  } catch (error) {
    console.error('Failed to fetch retail products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, sku, barcode, category, brand, costPrice, retailPrice, quantity, minQuantity, imageUrl } = body;

    const product = await prisma.retailProduct.create({
      data: {
        salonId: session.user.salonId,
        name,
        description,
        sku,
        barcode,
        category,
        brand,
        costPrice,
        retailPrice,
        quantity: quantity || 0,
        minQuantity: minQuantity || 5,
        imageUrl,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Failed to create retail product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    const product = await prisma.retailProduct.update({
      where: { id, salonId: session.user.salonId },
      data,
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Failed to update retail product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Soft delete by setting active to false
    await prisma.retailProduct.update({
      where: { id, salonId: session.user.salonId },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete retail product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

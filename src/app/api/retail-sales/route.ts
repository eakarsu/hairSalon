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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { salonId: session.user.salonId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    const sales = await prisma.retailSale.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        client: { select: { id: true, name: true } },
        soldBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const summary = {
      totalSales: sales.reduce((sum, s) => sum + s.totalPrice, 0),
      totalUnits: sales.reduce((sum, s) => sum + s.quantity, 0),
      salesCount: sales.length,
    };

    return NextResponse.json({ sales, summary });
  } catch (error) {
    console.error('Failed to fetch retail sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, clientId, quantity } = body;

    // Get product to check stock and get price
    const product = await prisma.retailProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
    }

    // Create sale and update stock in transaction
    const [sale] = await prisma.$transaction([
      prisma.retailSale.create({
        data: {
          salonId: session.user.salonId,
          productId,
          clientId,
          soldById: session.user.id,
          quantity,
          unitPrice: product.retailPrice,
          totalPrice: product.retailPrice * quantity,
        },
        include: {
          product: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
        },
      }),
      prisma.retailProduct.update({
        where: { id: productId },
        data: { quantity: { decrement: quantity } },
      }),
    ]);

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('Failed to create retail sale:', error);
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}

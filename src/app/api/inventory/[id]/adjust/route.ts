import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(
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
    const { quantityChange, reason } = body;

    if (typeof quantityChange !== 'number' || quantityChange === 0) {
      return NextResponse.json({ error: 'Valid quantity change required' }, { status: 400 });
    }

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        salonId: session.user.salonId,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const newQuantity = item.quantity + quantityChange;
    if (newQuantity < 0) {
      return NextResponse.json({ error: 'Cannot reduce quantity below 0' }, { status: 400 });
    }

    // Update item quantity and create transaction
    const [updatedItem] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id },
        data: { quantity: newQuantity },
      }),
      prisma.inventoryTransaction.create({
        data: {
          inventoryItemId: id,
          quantityChange,
          reason: reason || (quantityChange > 0 ? 'Stock added' : 'Stock removed'),
          performedBy: session.user.name,
        },
      }),
    ]);

    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    console.error('Inventory adjust error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

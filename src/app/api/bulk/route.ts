import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Bulk delete
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids, type } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 items per bulk operation' }, { status: 400 });
    }

    const salonId = session.user.salonId;
    let deletedCount = 0;

    switch (type) {
      case 'clients': {
        const result = await prisma.client.deleteMany({
          where: { id: { in: ids }, salonId },
        });
        deletedCount = result.count;
        break;
      }
      case 'services': {
        const result = await prisma.service.deleteMany({
          where: { id: { in: ids }, salonId },
        });
        deletedCount = result.count;
        break;
      }
      case 'inventory': {
        const result = await prisma.inventoryItem.deleteMany({
          where: { id: { in: ids }, salonId },
        });
        deletedCount = result.count;
        break;
      }
      case 'gift-cards': {
        const result = await prisma.giftCard.deleteMany({
          where: { id: { in: ids }, salonId },
        });
        deletedCount = result.count;
        break;
      }
      case 'tasks': {
        const result = await prisma.task.deleteMany({
          where: { id: { in: ids }, salonId },
        });
        deletedCount = result.count;
        break;
      }
      case 'campaigns': {
        const result = await prisma.campaign.deleteMany({
          where: { id: { in: ids }, salonId },
        });
        deletedCount = result.count;
        break;
      }
      case 'reviews': {
        const result = await prisma.review.deleteMany({
          where: { id: { in: ids }, salonId },
        });
        deletedCount = result.count;
        break;
      }
      case 'waitlist': {
        const result = await prisma.waitlist.deleteMany({
          where: { id: { in: ids }, salonId },
        });
        deletedCount = result.count;
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    return NextResponse.json({ message: `Deleted ${deletedCount} items`, deletedCount });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: 'Failed to delete items' }, { status: 500 });
  }
}

// Bulk update
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids, type, updates } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Updates object is required' }, { status: 400 });
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 items per bulk operation' }, { status: 400 });
    }

    const salonId = session.user.salonId;
    let updatedCount = 0;

    switch (type) {
      case 'clients': {
        const allowedFields: Record<string, boolean> = { marketingOptIn: true, preferredLanguage: true };
        const safeUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (allowedFields[key]) safeUpdates[key] = value;
        }
        const result = await prisma.client.updateMany({
          where: { id: { in: ids }, salonId },
          data: safeUpdates,
        });
        updatedCount = result.count;
        break;
      }
      case 'services': {
        const allowedFields: Record<string, boolean> = { active: true, category: true };
        const safeUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (allowedFields[key]) safeUpdates[key] = value;
        }
        const result = await prisma.service.updateMany({
          where: { id: { in: ids }, salonId },
          data: safeUpdates,
        });
        updatedCount = result.count;
        break;
      }
      case 'tasks': {
        const allowedFields: Record<string, boolean> = { status: true };
        const safeUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (allowedFields[key]) safeUpdates[key] = value;
        }
        const result = await prisma.task.updateMany({
          where: { id: { in: ids }, salonId },
          data: safeUpdates,
        });
        updatedCount = result.count;
        break;
      }
      case 'inventory': {
        const allowedFields: Record<string, boolean> = { category: true };
        const safeUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (allowedFields[key]) safeUpdates[key] = value;
        }
        const result = await prisma.inventoryItem.updateMany({
          where: { id: { in: ids }, salonId },
          data: safeUpdates,
        });
        updatedCount = result.count;
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    return NextResponse.json({ message: `Updated ${updatedCount} items`, updatedCount });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: 'Failed to update items' }, { status: 500 });
  }
}

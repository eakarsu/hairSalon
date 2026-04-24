import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

function toCsvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values.map((v) => {
    if (v === null || v === undefined) return '';
    const str = String(v);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(',');
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'clients';
    const salonId = session.user.salonId;

    let csvContent = '';

    switch (type) {
      case 'clients': {
        const clients = await prisma.client.findMany({
          where: { salonId },
          include: { preferredTech: { select: { name: true } } },
          orderBy: { name: 'asc' },
        });
        csvContent = toCsvRow(['Name', 'Phone', 'Email', 'Language', 'Preferred Tech', 'Marketing Opt-In', 'Birthday', 'Notes', 'Created At']) + '\n';
        clients.forEach((c) => {
          csvContent += toCsvRow([c.name, c.phone, c.email, c.preferredLanguage, c.preferredTech?.name, c.marketingOptIn, c.birthday?.toISOString().split('T')[0], c.notes, c.createdAt.toISOString()]) + '\n';
        });
        break;
      }
      case 'services': {
        const services = await prisma.service.findMany({ where: { salonId }, orderBy: { name: 'asc' } });
        csvContent = toCsvRow(['Name', 'Category', 'Duration (min)', 'Base Price', 'Active', 'Description']) + '\n';
        services.forEach((s) => {
          csvContent += toCsvRow([s.name, s.category, s.durationMinutes, s.basePrice, s.active, s.description]) + '\n';
        });
        break;
      }
      case 'appointments': {
        const appointments = await prisma.appointment.findMany({
          where: { salonId },
          include: { client: true, technician: true, service: true },
          orderBy: { startTime: 'desc' },
          take: 500,
        });
        csvContent = toCsvRow(['Date', 'Time', 'Client', 'Service', 'Technician', 'Status', 'Price']) + '\n';
        appointments.forEach((a) => {
          csvContent += toCsvRow([
            a.startTime.toISOString().split('T')[0],
            a.startTime.toISOString().split('T')[1]?.slice(0, 5),
            a.client.name,
            a.service.name,
            a.technician.name,
            a.status,
            a.totalPrice,
          ]) + '\n';
        });
        break;
      }
      case 'payments': {
        const payments = await prisma.payment.findMany({
          where: { salonId },
          include: { appointment: { include: { client: true } } },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
        csvContent = toCsvRow(['Date', 'Client', 'Amount', 'Method', 'Status']) + '\n';
        payments.forEach((p) => {
          csvContent += toCsvRow([
            p.createdAt.toISOString().split('T')[0],
            p.appointment?.client?.name || 'N/A',
            p.amount,
            p.method,
            p.status,
          ]) + '\n';
        });
        break;
      }
      case 'inventory': {
        const items = await prisma.inventoryItem.findMany({ where: { salonId }, orderBy: { name: 'asc' } });
        csvContent = toCsvRow(['Name', 'SKU', 'Category', 'Quantity', 'Min Stock', 'Unit Cost', 'Supplier']) + '\n';
        items.forEach((i) => {
          csvContent += toCsvRow([i.name, i.sku, i.category, i.quantity, i.minStock, i.unitCost, i.supplier]) + '\n';
        });
        break;
      }
      case 'staff': {
        const staff = await prisma.user.findMany({ where: { salonId }, orderBy: { name: 'asc' } });
        csvContent = toCsvRow(['Name', 'Email', 'Phone', 'Role', 'Level', 'Active', 'Language']) + '\n';
        staff.forEach((s) => {
          csvContent += toCsvRow([s.name, s.email, s.phone, s.role, s.level, s.active, s.preferredLanguage]) + '\n';
        });
        break;
      }
      case 'gift-cards': {
        const giftCards = await prisma.giftCard.findMany({ where: { salonId }, orderBy: { createdAt: 'desc' } });
        csvContent = toCsvRow(['Code', 'Initial Balance', 'Current Balance', 'Status', 'Purchaser', 'Recipient', 'Created At', 'Expires At']) + '\n';
        giftCards.forEach((g) => {
          csvContent += toCsvRow([g.code, g.initialBalance, g.currentBalance, g.status, g.purchaserName, g.recipientName, g.createdAt.toISOString().split('T')[0], g.expiresAt?.toISOString().split('T')[0]]) + '\n';
        });
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type}-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Generate a simple PDF-like HTML report that can be printed as PDF
function generatePdfHtml(title: string, headers: string[], rows: string[][], salonName: string): string {
  const headerCells = headers.map((h) => `<th style="border:1px solid #ddd;padding:8px;background:#e91e63;color:white;text-align:left;">${h}</th>`).join('');
  const bodyRows = rows.map((row) => {
    const cells = row.map((cell) => `<td style="border:1px solid #ddd;padding:8px;">${cell || ''}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>${title} - ${salonName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #e91e63; margin-bottom: 5px; }
    .subtitle { color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    tr:nth-child(even) { background: #f9f9f9; }
    .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
    .stats { display: flex; gap: 20px; margin-bottom: 20px; }
    .stat-box { background: #f5f5f5; padding: 15px; border-radius: 8px; flex: 1; }
    .stat-value { font-size: 24px; font-weight: bold; color: #e91e63; }
    .stat-label { font-size: 12px; color: #666; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="subtitle">${salonName} | Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  <div class="stats">
    <div class="stat-box"><div class="stat-value">${rows.length}</div><div class="stat-label">Total Records</div></div>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="footer">NailFlow AI - Salon Management Platform</div>
</body>
</html>`;
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

    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    const salonName = salon?.name || 'NailFlow AI';

    let html = '';

    switch (type) {
      case 'clients': {
        const clients = await prisma.client.findMany({
          where: { salonId },
          include: { preferredTech: { select: { name: true } } },
          orderBy: { name: 'asc' },
        });
        const headers = ['Name', 'Phone', 'Email', 'Language', 'Preferred Tech', 'Marketing'];
        const rows = clients.map((c) => [c.name, c.phone, c.email || '', c.preferredLanguage, c.preferredTech?.name || '', c.marketingOptIn ? 'Yes' : 'No']);
        html = generatePdfHtml('Client Report', headers, rows, salonName);
        break;
      }
      case 'services': {
        const services = await prisma.service.findMany({ where: { salonId }, orderBy: { name: 'asc' } });
        const headers = ['Name', 'Category', 'Duration', 'Price', 'Status'];
        const rows = services.map((s) => [s.name, s.category, `${s.durationMinutes} min`, `$${s.basePrice}`, s.active ? 'Active' : 'Inactive']);
        html = generatePdfHtml('Services Report', headers, rows, salonName);
        break;
      }
      case 'appointments': {
        const appointments = await prisma.appointment.findMany({
          where: { salonId },
          include: { client: true, technician: true, service: true },
          orderBy: { startTime: 'desc' },
          take: 200,
        });
        const headers = ['Date', 'Client', 'Service', 'Technician', 'Status', 'Price'];
        const rows = appointments.map((a) => [
          a.startTime.toLocaleDateString(),
          a.client.name,
          a.service.name,
          a.technician.name,
          a.status,
          `$${a.totalPrice}`,
        ]);
        html = generatePdfHtml('Appointments Report', headers, rows, salonName);
        break;
      }
      case 'inventory': {
        const items = await prisma.inventoryItem.findMany({ where: { salonId }, orderBy: { name: 'asc' } });
        const headers = ['Name', 'SKU', 'Category', 'Quantity', 'Min Stock', 'Unit Cost'];
        const rows = items.map((i) => [i.name, i.sku || '', i.category, String(i.quantity), String(i.minStock), `$${i.unitCost}`]);
        html = generatePdfHtml('Inventory Report', headers, rows, salonName);
        break;
      }
      case 'staff': {
        const staff = await prisma.user.findMany({ where: { salonId }, orderBy: { name: 'asc' } });
        const headers = ['Name', 'Email', 'Role', 'Level', 'Status'];
        const rows = staff.map((s) => [s.name, s.email, s.role, s.level || 'N/A', s.active ? 'Active' : 'Inactive']);
        html = generatePdfHtml('Staff Report', headers, rows, salonName);
        break;
      }
      case 'payments': {
        const payments = await prisma.payment.findMany({
          where: { salonId },
          include: { appointment: { include: { client: true } } },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });
        const headers = ['Date', 'Client', 'Amount', 'Method', 'Status'];
        const rows = payments.map((p) => [
          p.createdAt.toLocaleDateString(),
          p.appointment?.client?.name || 'N/A',
          `$${p.amount}`,
          p.method,
          p.status,
        ]);
        html = generatePdfHtml('Payments Report', headers, rows, salonName);
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${type}-report-${new Date().toISOString().split('T')[0]}.html"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

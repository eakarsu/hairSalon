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

    const packages = await prisma.servicePackage.findMany({
      where: { salonId: session.user.salonId, active: true },
      include: {
        services: {
          include: {
            service: { select: { id: true, name: true, basePrice: true, durationMinutes: true } },
          },
        },
        sales: {
          where: { expiresAt: { gte: new Date() } },
          include: {
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate regular price for each package
    const packagesWithSavings = packages.map(pkg => {
      const regularPrice = pkg.services.reduce(
        (sum, ps) => sum + (ps.service.basePrice * ps.quantity),
        0
      );
      return {
        ...pkg,
        regularPrice,
        savings: regularPrice - pkg.price,
        savingsPercent: ((regularPrice - pkg.price) / regularPrice * 100).toFixed(0),
      };
    });

    return NextResponse.json({ packages: packagesWithSavings });
  } catch (error) {
    console.error('Failed to fetch packages:', error);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, price, validDays, services } = body;

    const servicePackage = await prisma.servicePackage.create({
      data: {
        salonId: session.user.salonId,
        name,
        description,
        price,
        validDays: validDays || 365,
        services: {
          create: services.map((s: { serviceId: string; quantity: number }) => ({
            serviceId: s.serviceId,
            quantity: s.quantity || 1,
          })),
        },
      },
      include: {
        services: {
          include: {
            service: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ package: servicePackage });
  } catch (error) {
    console.error('Failed to create package:', error);
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
  }
}

// Sell a package to a client
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { packageId, clientId, amountPaid } = body;

    const pkg = await prisma.servicePackage.findUnique({
      where: { id: packageId },
      include: {
        services: true,
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Create services remaining JSON
    const servicesRemaining: Record<string, number> = {};
    pkg.services.forEach(s => {
      servicesRemaining[s.serviceId] = s.quantity;
    });

    const sale = await prisma.packageSale.create({
      data: {
        salonId: session.user.salonId,
        packageId,
        clientId,
        amountPaid: amountPaid || pkg.price,
        expiresAt: new Date(Date.now() + pkg.validDays * 24 * 60 * 60 * 1000),
        servicesRemaining,
      },
      include: {
        package: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('Failed to sell package:', error);
    return NextResponse.json({ error: 'Failed to sell package' }, { status: 500 });
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
      return NextResponse.json({ error: 'Package ID required' }, { status: 400 });
    }

    await prisma.servicePackage.update({
      where: { id, salonId: session.user.salonId },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete package:', error);
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { createQuote } from '@/lib/field-service/workflow';

export async function POST(request: NextRequest) {
  try {
    const key = requireIdempotencyKey(request.headers);
    const body = await request.json();
    if (!body.salonId || !body.serviceId || !body.clientName || !body.clientPhone) {
      return NextResponse.json({ error: 'Salon, service, client name, and phone are required' }, { status: 400 });
    }
    const service = await prisma.service.findFirst({ where: { id: body.serviceId, salonId: body.salonId, active: true } });
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    let client = await prisma.client.findFirst({ where: { salonId: body.salonId, phone: body.clientPhone } });
    if (!client) {
      client = await prisma.client.create({ data: { salonId: body.salonId, name: body.clientName, phone: body.clientPhone, email: body.clientEmail || null, marketingOptIn: body.marketingOptIn === true } });
    }
    const sourceRef = `quote:${key}`;
    const mapEvidence = body.serviceAddress
      ? await callFieldProvider('MAP_ROUTE', { sourceRef, idempotencyKey: `map:${key}`, payload: { salonId: body.salonId, destination: { address: body.serviceAddress, latitude: body.latitude, longitude: body.longitude } } })
      : undefined;
    const travelCents = Number(mapEvidence?.result.travelCents || 0);
    const taxEvidence = await callFieldProvider('TAX_QUOTE', { sourceRef, idempotencyKey: `tax:${key}`, payload: { salonId: body.salonId, currency: 'USD', lineItems: [{ reference: service.id, description: service.name, quantity: 1, unitPriceCents: Math.round(service.basePrice * 100) }, ...(travelCents ? [{ reference: 'travel', description: 'Travel', quantity: 1, unitPriceCents: travelCents }] : [])], destination: body.serviceAddress || null } });
    const quote = await createQuote({ salonId: body.salonId, clientId: client.id, serviceId: service.id, technicianId: body.technicianId, idempotencyKey: key, serviceAddress: body.serviceAddress, latitude: body.latitude, longitude: body.longitude, mapEvidence, taxEvidence });
    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

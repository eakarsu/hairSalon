import { randomBytes } from 'crypto';
import type {
  AppointmentStatus,
  Prisma,
  PrismaClient,
  SkillLevel,
  User,
} from '@prisma/client';
import prisma from '../prisma';
import { canonicalJson, deriveCustomerToken, digestJson, sha256 } from './canonical';
import { appointmentTimestamps, assertAppointmentTransition, nextPaymentStatus } from './state-machine';
import type { ProviderEvidence } from './provider';

type Tx = Prisma.TransactionClient;

export class WorkflowError extends Error {
  constructor(message: string, public status = 409, public code = 'WORKFLOW_CONFLICT') {
    super(message);
  }
}

const skillRank: Record<SkillLevel, number> = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };
const blockingStatuses: AppointmentStatus[] = [
  'RESERVED', 'BOOKED', 'CONFIRMED', 'DISPATCHED', 'EN_ROUTE', 'IN_PROGRESS', 'PARTIALLY_COMPLETED',
];

function numberFromEvidence(evidence: ProviderEvidence, key: string): number {
  const value = evidence.result[key];
  if (!Number.isInteger(value) || Number(value) < 0) throw new WorkflowError(`Provider result is missing ${key}`, 502, 'INVALID_PROVIDER_EVIDENCE');
  return Number(value);
}

async function lock(tx: Tx, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

async function appendEvent(
  tx: Tx,
  input: {
    appointmentId: string;
    salonId: string;
    eventType: string;
    fromStatus?: AppointmentStatus | null;
    toStatus?: AppointmentStatus | null;
    actor?: Pick<User, 'id' | 'role'> | null;
    actorRole?: string;
    idempotencyKey: string;
    payload?: Record<string, unknown>;
  }
) {
  await lock(tx, `appointment-event:${input.appointmentId}`);
  const replay = await tx.appointmentEvent.findUnique({
    where: { appointmentId_idempotencyKey: { appointmentId: input.appointmentId, idempotencyKey: input.idempotencyKey } },
  });
  if (replay) return replay;
  const previous = await tx.appointmentEvent.findFirst({ where: { appointmentId: input.appointmentId }, orderBy: { sequence: 'desc' } });
  const sequence = (previous?.sequence || 0) + 1;
  const occurredAt = new Date();
  const payload = input.payload || {};
  const eventHash = sha256(canonicalJson({
    appointmentId: input.appointmentId,
    sequence,
    eventType: input.eventType,
    fromStatus: input.fromStatus || null,
    toStatus: input.toStatus || null,
    actorId: input.actor?.id || null,
    actorRole: input.actor?.role || input.actorRole || 'SYSTEM',
    idempotencyKey: input.idempotencyKey,
    payload,
    previousHash: previous?.eventHash || null,
    occurredAt,
  }));
  return tx.appointmentEvent.create({
    data: {
      salonId: input.salonId,
      appointmentId: input.appointmentId,
      sequence,
      eventType: input.eventType,
      fromStatus: input.fromStatus || null,
      toStatus: input.toStatus || null,
      actorId: input.actor?.id,
      actorRole: input.actor?.role || input.actorRole || 'SYSTEM',
      idempotencyKey: input.idempotencyKey,
      payload: payload as Prisma.InputJsonValue,
      previousHash: previous?.eventHash,
      eventHash,
      occurredAt,
    },
  });
}

async function recordEvidence(
  tx: Tx,
  salonId: string,
  appointmentId: string | null,
  evidence: ProviderEvidence,
  idempotencyKey: string,
  direction: 'OUTBOUND' | 'INBOUND_WEBHOOK' = 'OUTBOUND'
) {
  const replay = await tx.fieldProviderEvent.findUnique({
    where: { provider_providerEventId: { provider: evidence.provider, providerEventId: evidence.eventId } },
  });
  if (replay) {
    if (replay.payloadDigest !== evidence.payloadDigest || replay.operation !== evidence.operation) {
      throw new WorkflowError('Provider event identity was replayed with altered evidence', 409, 'ALTERED_PROVIDER_REPLAY');
    }
    return replay;
  }
  return tx.fieldProviderEvent.create({
    data: {
      salonId,
      appointmentId,
      provider: evidence.provider,
      providerEventId: evidence.eventId,
      operation: evidence.operation,
      direction,
      idempotencyKey,
      payloadDigest: evidence.payloadDigest,
      payload: evidence.payload as Prisma.InputJsonValue,
      occurredAt: evidence.occurredAt,
    },
  });
}

function zonedParts(date: Date, timezone: string): { dayOfWeek: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { dayOfWeek, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function clockMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

async function assertTechnicianAvailability(
  tx: Tx,
  input: { salonId: string; serviceId: string; technicianId: string; startTime: Date; endTime: Date; excludeAppointmentId?: string }
) {
  if (input.endTime <= input.startTime) throw new WorkflowError('Appointment end must be after its start', 400, 'INVALID_TIME_RANGE');
  const [salon, service, technician] = await Promise.all([
    tx.salon.findUnique({ where: { id: input.salonId }, select: { timezone: true } }),
    tx.service.findFirst({
      where: { id: input.serviceId, salonId: input.salonId, active: true },
      include: { skillRequirements: true },
    }),
    tx.user.findFirst({
      where: { id: input.technicianId, salonId: input.salonId, active: true, role: 'TECHNICIAN' },
      include: { skills: true },
    }),
  ]);
  if (!salon || !service || !technician) throw new WorkflowError('Service or technician is unavailable', 409, 'RESOURCE_UNAVAILABLE');
  for (const requirement of service.skillRequirements) {
    const skill = technician.skills.find((candidate) => candidate.skillName.toLowerCase() === requirement.skillName.toLowerCase());
    if (!skill || skillRank[skill.level] < skillRank[requirement.minLevel] || (requirement.certified && !skill.certified) || (skill.certExpiry && skill.certExpiry < input.startTime)) {
      throw new WorkflowError(`Technician does not satisfy skill ${requirement.skillName}`, 409, 'SKILL_MISMATCH');
    }
  }
  const start = zonedParts(input.startTime, salon.timezone);
  const end = zonedParts(input.endTime, salon.timezone);
  const schedule = await tx.staffSchedule.findUnique({
    where: { technicianId_dayOfWeek: { technicianId: input.technicianId, dayOfWeek: start.dayOfWeek } },
  });
  if (!schedule?.isWorking || end.dayOfWeek !== start.dayOfWeek || start.minutes < clockMinutes(schedule.startTime) || end.minutes > clockMinutes(schedule.endTime)) {
    throw new WorkflowError('Requested time falls outside the technician schedule', 409, 'OUTSIDE_SCHEDULE');
  }
  const stationCount = await tx.station.count({ where: { salonId: input.salonId, active: true } });
  if (stationCount > 0) {
    const assignments = await tx.stationAssignment.findMany({
      where: { technicianId: input.technicianId, station: { salonId: input.salonId, active: true } },
      include: { station: { select: { id: true } } },
    });
    const assignment = assignments.find((item) =>
      (item.dayOfWeek == null || item.dayOfWeek === start.dayOfWeek) &&
      (!item.startTime || clockMinutes(item.startTime) <= start.minutes) &&
      (!item.endTime || clockMinutes(item.endTime) >= end.minutes)
    );
    if (!assignment) throw new WorkflowError('No compatible station is assigned to this technician', 409, 'STATION_UNAVAILABLE');
    const stationPeers = (await tx.stationAssignment.findMany({ where: { stationId: assignment.station.id, technicianId: { not: input.technicianId } }, select: { technicianId: true, dayOfWeek: true, startTime: true, endTime: true } }))
      .filter((peer) => (peer.dayOfWeek == null || peer.dayOfWeek === start.dayOfWeek) && (!peer.startTime || clockMinutes(peer.startTime) < end.minutes) && (!peer.endTime || clockMinutes(peer.endTime) > start.minutes));
    if (stationPeers.length) {
      const stationConflict = await tx.appointment.findFirst({ where: { technicianId: { in: stationPeers.map((peer) => peer.technicianId) }, status: { in: blockingStatuses }, startTime: { lt: input.endTime }, endTime: { gt: input.startTime } } });
      if (stationConflict) throw new WorkflowError('Required station is already allocated', 409, 'STATION_UNAVAILABLE');
    }
  }
  const [timeOff, conflict] = await Promise.all([
    tx.timeOffRequest.findFirst({
      where: { technicianId: input.technicianId, status: 'APPROVED', startDate: { lt: input.endTime }, endDate: { gt: input.startTime } },
    }),
    tx.appointment.findFirst({
      where: {
        technicianId: input.technicianId,
        id: input.excludeAppointmentId ? { not: input.excludeAppointmentId } : undefined,
        status: { in: blockingStatuses },
        startTime: { lt: input.endTime },
        endTime: { gt: input.startTime },
      },
    }),
  ]);
  if (timeOff) throw new WorkflowError('Technician has approved time off', 409, 'TECHNICIAN_TIME_OFF');
  if (conflict) throw new WorkflowError('Time slot is already booked', 409, 'OVERBOOKING');
  return { service, technician };
}

export async function getAvailability(input: {
  salonId: string;
  serviceId: string;
  technicianId: string;
  startTime: Date;
  endTime: Date;
}, client: PrismaClient | Tx = prisma) {
  return assertTechnicianAvailability(client as Tx, input);
}

export async function createQuote(input: {
  salonId: string;
  clientId: string;
  serviceId: string;
  technicianId?: string;
  idempotencyKey: string;
  serviceAddress?: string;
  latitude?: number;
  longitude?: number;
  mapEvidence?: ProviderEvidence;
  taxEvidence: ProviderEvidence;
}) {
  const requestDigest = digestJson({ ...input, mapEvidence: input.mapEvidence?.payloadDigest, taxEvidence: input.taxEvidence.payloadDigest });
  return prisma.$transaction(async (tx) => {
    await lock(tx, `quote-idempotency:${input.idempotencyKey}`);
    const replay = await tx.serviceQuote.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (replay) {
      if (replay.requestDigest !== requestDigest) throw new WorkflowError('Idempotency key belongs to a different quote request');
      return replay;
    }
    const [client, service] = await Promise.all([
      tx.client.findFirst({ where: { id: input.clientId, salonId: input.salonId } }),
      tx.service.findFirst({ where: { id: input.serviceId, salonId: input.salonId, active: true } }),
    ]);
    if (!client || !service) throw new WorkflowError('Client or service not found', 404, 'NOT_FOUND');
    if (input.technicianId) {
      const technician = await tx.user.findFirst({ where: { id: input.technicianId, salonId: input.salonId, active: true } });
      if (!technician) throw new WorkflowError('Technician not found', 404, 'NOT_FOUND');
    }
    let travelCents = 0;
    let distanceMeters: number | undefined;
    if (input.serviceAddress || input.latitude != null || input.longitude != null) {
      const serviceAreas = await tx.serviceArea.count({ where: { salonId: input.salonId, active: true } });
      if (!serviceAreas) throw new WorkflowError('No active service area is configured', 409, 'SERVICE_AREA_UNCONFIGURED');
      if (!input.mapEvidence || input.mapEvidence.operation !== 'MAP_ROUTE' || input.mapEvidence.status !== 'SUCCEEDED') {
        throw new WorkflowError('Licensed route evidence is required for on-site service', 502, 'MAP_EVIDENCE_REQUIRED');
      }
      if (input.mapEvidence.result.withinServiceArea !== true) throw new WorkflowError('Address is outside the configured service area', 409, 'OUTSIDE_SERVICE_AREA');
      travelCents = numberFromEvidence(input.mapEvidence, 'travelCents');
      distanceMeters = numberFromEvidence(input.mapEvidence, 'distanceMeters');
      await recordEvidence(tx, input.salonId, null, input.mapEvidence, `quote-map:${input.idempotencyKey}`);
    }
    if (input.taxEvidence.operation !== 'TAX_QUOTE' || input.taxEvidence.status !== 'SUCCEEDED') {
      throw new WorkflowError('Successful licensed tax evidence is required', 502, 'TAX_EVIDENCE_REQUIRED');
    }
    const serviceCents = Math.round(service.basePrice * 100);
    const taxCents = numberFromEvidence(input.taxEvidence, 'taxCents');
    await recordEvidence(tx, input.salonId, null, input.taxEvidence, `quote-tax:${input.idempotencyKey}`);
    return tx.serviceQuote.create({
      data: {
        quoteNumber: `Q-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        salonId: input.salonId,
        clientId: input.clientId,
        serviceId: input.serviceId,
        technicianId: input.technicianId,
        status: 'OFFERED',
        idempotencyKey: input.idempotencyKey,
        requestDigest,
        serviceCents,
        travelCents,
        taxCents,
        totalCents: serviceCents + travelCents + taxCents,
        durationMinutes: service.durationMinutes,
        serviceAddress: input.serviceAddress,
        latitude: input.latitude,
        longitude: input.longitude,
        distanceMeters,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  }, { isolationLevel: 'ReadCommitted' });
}

export async function bookQuote(input: {
  quoteId: string;
  technicianId: string;
  startTime: Date;
  idempotencyKey: string;
  calendarEvidence: ProviderEvidence;
  actor?: Pick<User, 'id' | 'role'>;
}) {
  const requestDigest = digestJson({ quoteId: input.quoteId, technicianId: input.technicianId, startTime: input.startTime });
  const customerToken = deriveCustomerToken(input.idempotencyKey);
  const appointment = await prisma.$transaction(async (tx) => {
    await lock(tx, `booking-idempotency:${input.idempotencyKey}`);
    const replay = await tx.appointment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (replay) {
      if (replay.requestDigest !== requestDigest) throw new WorkflowError('Idempotency key belongs to a different booking request');
      return replay;
    }
    // One lock per technician serializes every potentially-overlapping interval,
    // including concurrent requests with different start times.
    await lock(tx, `technician:${input.technicianId}`);
    const quote = await tx.serviceQuote.findUnique({ where: { id: input.quoteId }, include: { service: { include: { inventoryRequirements: true } } } });
    if (!quote || !['OFFERED', 'ACCEPTED'].includes(quote.status)) throw new WorkflowError('Quote is unavailable', 409, 'QUOTE_UNAVAILABLE');
    if (quote.expiresAt < new Date()) throw new WorkflowError('Quote expired', 409, 'QUOTE_EXPIRED');
    const endTime = new Date(input.startTime.getTime() + quote.durationMinutes * 60_000);
    await assertTechnicianAvailability(tx, { salonId: quote.salonId, serviceId: quote.serviceId, technicianId: input.technicianId, startTime: input.startTime, endTime });
    if (input.calendarEvidence.operation !== 'CALENDAR_RESERVE' || input.calendarEvidence.status !== 'SUCCEEDED' || input.calendarEvidence.payload.sourceRef !== quote.quoteNumber) {
      throw new WorkflowError('Successful calendar reservation evidence is required', 502, 'CALENDAR_EVIDENCE_REQUIRED');
    }
    for (const requirement of quote.service.inventoryRequirements) {
      await tx.$queryRaw`SELECT id FROM "InventoryItem" WHERE id = ${requirement.inventoryItemId} FOR UPDATE`;
      const item = await tx.inventoryItem.findFirst({ where: { id: requirement.inventoryItemId, salonId: quote.salonId, active: true } });
      if (!item || item.quantity < requirement.quantity) throw new WorkflowError(`Insufficient inventory for ${item?.name || requirement.inventoryItemId}`, 409, 'INSUFFICIENT_INVENTORY');
    }
    const created = await tx.appointment.create({
      data: {
        appointmentNumber: `A-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        salonId: quote.salonId,
        clientId: quote.clientId,
        technicianId: input.technicianId,
        serviceId: quote.serviceId,
        quoteId: quote.id,
        startTime: input.startTime,
        endTime,
        status: 'BOOKED',
        source: input.actor ? 'PHONE' : 'ONLINE',
        idempotencyKey: input.idempotencyKey,
        requestDigest,
        customerAccessTokenHash: sha256(customerToken),
        serviceCents: quote.serviceCents,
        travelCents: quote.travelCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        serviceAddress: quote.serviceAddress,
        serviceLatitude: quote.latitude,
        serviceLongitude: quote.longitude,
        travelDistanceMeters: quote.distanceMeters,
      },
    });
    for (const requirement of quote.service.inventoryRequirements) {
      await tx.inventoryItem.update({ where: { id: requirement.inventoryItemId }, data: { quantity: { decrement: requirement.quantity } } });
      await tx.inventoryReservation.create({ data: { appointmentId: created.id, inventoryItemId: requirement.inventoryItemId, quantity: requirement.quantity } });
      await tx.inventoryTransaction.create({ data: { inventoryItemId: requirement.inventoryItemId, quantityChange: -requirement.quantity, reason: `Reservation ${created.appointmentNumber}`, performedBy: input.actor?.id || 'CUSTOMER' } });
    }
    await tx.serviceQuote.update({ where: { id: quote.id }, data: { status: 'ACCEPTED', acceptedAt: new Date(), technicianId: input.technicianId } });
    await recordEvidence(tx, quote.salonId, created.id, input.calendarEvidence, `booking-calendar:${input.idempotencyKey}`);
    await appendEvent(tx, {
      salonId: quote.salonId,
      appointmentId: created.id,
      eventType: 'QUOTE_ACCEPTED_AND_BOOKED',
      fromStatus: 'QUOTED',
      toStatus: 'BOOKED',
      actor: input.actor,
      actorRole: input.actor ? undefined : 'CUSTOMER',
      idempotencyKey: `booking:${input.idempotencyKey}`,
      payload: { quoteId: quote.id, calendarEventId: input.calendarEvidence.eventId },
    });
    return created;
  }, { isolationLevel: 'ReadCommitted' });
  return { ...appointment, customerAccessToken: customerToken };
}

export async function transitionAppointment(input: {
  appointmentId: string;
  toStatus: AppointmentStatus;
  idempotencyKey: string;
  actor?: Pick<User, 'id' | 'role'>;
  actorRole?: string;
  expectedVersion?: number;
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    await lock(tx, `appointment:${input.appointmentId}`);
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId } });
    if (!appointment) throw new WorkflowError('Appointment not found', 404, 'NOT_FOUND');
    const replay = await tx.appointmentEvent.findUnique({ where: { appointmentId_idempotencyKey: { appointmentId: appointment.id, idempotencyKey: input.idempotencyKey } } });
    if (replay) return appointment;
    if (input.expectedVersion != null && appointment.version !== input.expectedVersion) throw new WorkflowError('Appointment version conflict', 409, 'VERSION_CONFLICT');
    if (input.toStatus === 'CANCELLED') throw new WorkflowError('Use the cancellation workflow with calendar evidence', 400, 'CANCELLATION_WORKFLOW_REQUIRED');
    if (input.toStatus === 'EXCEPTION' && !input.note?.trim()) throw new WorkflowError('Exception reason is required', 400, 'EXCEPTION_REASON_REQUIRED');
    assertAppointmentTransition(appointment.status, input.toStatus);
    if (input.toStatus === 'COMPLETED') {
      await tx.inventoryReservation.updateMany({
        where: { appointmentId: appointment.id, status: 'ACTIVE' },
        data: { status: 'CONSUMED', consumedAt: new Date() },
      });
    }
    if (input.toStatus === 'NO_SHOW') {
      const reservations = await tx.inventoryReservation.findMany({ where: { appointmentId: appointment.id, status: 'ACTIVE' } });
      for (const reservation of reservations) {
        await tx.$queryRaw`SELECT id FROM "InventoryItem" WHERE id = ${reservation.inventoryItemId} FOR UPDATE`;
        await tx.inventoryItem.update({ where: { id: reservation.inventoryItemId }, data: { quantity: { increment: reservation.quantity } } });
        await tx.inventoryReservation.update({ where: { id: reservation.id }, data: { status: 'RELEASED', releasedAt: new Date() } });
        await tx.inventoryTransaction.create({ data: { inventoryItemId: reservation.inventoryItemId, quantityChange: reservation.quantity, reason: `No-show ${appointment.appointmentNumber}`, performedBy: input.actor?.id || input.actorRole || 'SYSTEM' } });
      }
    }
    const updated = await tx.appointment.update({
      where: { id: appointment.id, version: appointment.version },
      data: {
        status: input.toStatus,
        version: { increment: 1 },
        ...appointmentTimestamps(input.toStatus),
        ...(input.toStatus === 'EXCEPTION'
          ? { exceptionCode: 'MANUAL_EXCEPTION', exceptionReason: input.note }
          : { exceptionCode: null, exceptionReason: null }),
      },
    });
    await appendEvent(tx, {
      salonId: appointment.salonId,
      appointmentId: appointment.id,
      eventType: `STATUS_${input.toStatus}`,
      fromStatus: appointment.status,
      toStatus: input.toStatus,
      actor: input.actor,
      actorRole: input.actorRole,
      idempotencyKey: input.idempotencyKey,
      payload: { note: input.note || null },
    });
    return updated;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function recordPartialWork(input: {
  appointmentId: string;
  quantity: number;
  notes: string;
  idempotencyKey: string;
  actor: Pick<User, 'id' | 'role'>;
}) {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0 || !input.notes?.trim()) throw new WorkflowError('Positive work quantity and notes are required', 400);
  return prisma.$transaction(async (tx) => {
    await lock(tx, `appointment:${input.appointmentId}`);
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId } });
    if (!appointment || !['IN_PROGRESS', 'PARTIALLY_COMPLETED'].includes(appointment.status)) throw new WorkflowError('Appointment is not in progress');
    const replay = await tx.appointmentEvent.findUnique({ where: { appointmentId_idempotencyKey: { appointmentId: appointment.id, idempotencyKey: input.idempotencyKey } } });
    if (replay) return appointment;
    const last = await tx.jobProgress.findFirst({ where: { appointmentId: appointment.id }, orderBy: { sequence: 'desc' } });
    await tx.jobProgress.create({ data: { appointmentId: appointment.id, sequence: (last?.sequence || 0) + 1, kind: 'PARTIAL_WORK', quantity: input.quantity, notes: input.notes, occurredAt: new Date() } });
    const updated = appointment.status === 'IN_PROGRESS'
      ? await tx.appointment.update({ where: { id: appointment.id }, data: { status: 'PARTIALLY_COMPLETED', version: { increment: 1 } } })
      : appointment;
    await appendEvent(tx, { salonId: appointment.salonId, appointmentId: appointment.id, eventType: 'PARTIAL_WORK_RECORDED', fromStatus: appointment.status, toStatus: updated.status, actor: input.actor, idempotencyKey: input.idempotencyKey, payload: { quantity: input.quantity, notes: input.notes } });
    return updated;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function proposeChangeOrder(input: {
  appointmentId: string;
  description: string;
  amountCents: number;
  durationDeltaMinutes?: number;
  requestedBy: string;
}) {
  if (!input.description.trim() || !Number.isInteger(input.amountCents)) throw new WorkflowError('Change description and integer amountCents are required', 400);
  return prisma.$transaction(async (tx) => {
    await lock(tx, `appointment:${input.appointmentId}`);
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId } });
    if (!appointment || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) throw new WorkflowError('Appointment cannot accept a change order');
    const last = await tx.changeOrder.findFirst({ where: { appointmentId: appointment.id }, orderBy: { sequence: 'desc' } });
    return tx.changeOrder.create({ data: { appointmentId: appointment.id, sequence: (last?.sequence || 0) + 1, description: input.description, amountCents: input.amountCents, durationDeltaMinutes: input.durationDeltaMinutes || 0, requestedBy: input.requestedBy } });
  });
}

export async function approveChangeOrder(input: { changeOrderId: string; approvedBy: string; idempotencyKey: string; taxEvidence: ProviderEvidence }) {
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.changeOrder.findUnique({ where: { id: input.changeOrderId }, select: { appointmentId: true } });
    if (!candidate) throw new WorkflowError('Change order is unavailable');
    await lock(tx, `appointment:${candidate.appointmentId}`);
    const change = await tx.changeOrder.findUnique({ where: { id: input.changeOrderId }, include: { appointment: true } });
    if (!change || change.status !== 'PROPOSED') throw new WorkflowError('Change order is unavailable');
    await lock(tx, `technician:${change.appointment.technicianId}`);
    if (input.taxEvidence.operation !== 'TAX_QUOTE' || input.taxEvidence.status !== 'SUCCEEDED') throw new WorkflowError('Updated tax evidence is required', 502);
    const taxCents = numberFromEvidence(input.taxEvidence, 'taxCents');
    const nextEnd = new Date(change.appointment.endTime.getTime() + change.durationDeltaMinutes * 60_000);
    await assertTechnicianAvailability(tx, {
      salonId: change.appointment.salonId,
      serviceId: change.appointment.serviceId,
      technicianId: change.appointment.technicianId,
      startTime: change.appointment.startTime,
      endTime: nextEnd,
      excludeAppointmentId: change.appointment.id,
    });
    await recordEvidence(tx, change.appointment.salonId, change.appointment.id, input.taxEvidence, `change-tax:${input.idempotencyKey}`);
    const serviceAndChanges = change.appointment.serviceCents + change.appointment.travelCents + change.appointment.changeOrderCents + change.amountCents;
    const updated = await tx.appointment.update({ where: { id: change.appointmentId }, data: { changeOrderCents: { increment: change.amountCents }, taxCents, totalCents: serviceAndChanges + taxCents, endTime: nextEnd, version: { increment: 1 } } });
    await tx.changeOrder.update({ where: { id: change.id }, data: { status: 'APPLIED', approvedBy: input.approvedBy, approvedAt: new Date(), appliedAt: new Date() } });
    await appendEvent(tx, { salonId: updated.salonId, appointmentId: updated.id, eventType: 'CHANGE_ORDER_APPLIED', fromStatus: updated.status, toStatus: updated.status, actorRole: 'CUSTOMER', idempotencyKey: input.idempotencyKey, payload: { changeOrderId: change.id, amountCents: change.amountCents, taxCents } });
    return updated;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function reassignTechnician(input: { appointmentId: string; technicianId: string; actor: Pick<User, 'id' | 'role'>; idempotencyKey: string }) {
  return prisma.$transaction(async (tx) => {
    await lock(tx, `appointment:${input.appointmentId}`);
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId } });
    if (!appointment || !['BOOKED', 'CONFIRMED', 'DISPATCHED'].includes(appointment.status)) throw new WorkflowError('Appointment cannot be reassigned');
    await lock(tx, `technician:${input.technicianId}`);
    await assertTechnicianAvailability(tx, { salonId: appointment.salonId, serviceId: appointment.serviceId, technicianId: input.technicianId, startTime: appointment.startTime, endTime: appointment.endTime, excludeAppointmentId: appointment.id });
    const updated = await tx.appointment.update({ where: { id: appointment.id }, data: { technicianId: input.technicianId, version: { increment: 1 } } });
    await appendEvent(tx, { salonId: appointment.salonId, appointmentId: appointment.id, eventType: 'TECHNICIAN_REASSIGNED', fromStatus: appointment.status, toStatus: appointment.status, actor: input.actor, idempotencyKey: input.idempotencyKey, payload: { fromTechnicianId: appointment.technicianId, toTechnicianId: input.technicianId } });
    return updated;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function rescheduleAppointment(input: {
  appointmentId: string;
  technicianId?: string;
  startTime: Date;
  endTime: Date;
  releaseEvidence: ProviderEvidence;
  reserveEvidence: ProviderEvidence;
  actor: Pick<User, 'id' | 'role'>;
  idempotencyKey: string;
}) {
  return prisma.$transaction(async (tx) => {
    await lock(tx, `appointment:${input.appointmentId}`);
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId } });
    if (!appointment || !['BOOKED', 'CONFIRMED', 'DISPATCHED'].includes(appointment.status)) throw new WorkflowError('Appointment cannot be rescheduled');
    const replay = await tx.appointmentEvent.findUnique({ where: { appointmentId_idempotencyKey: { appointmentId: appointment.id, idempotencyKey: input.idempotencyKey } } });
    if (replay) return appointment;
    if (input.releaseEvidence.operation !== 'CALENDAR_RELEASE' || input.releaseEvidence.status !== 'SUCCEEDED' || input.reserveEvidence.operation !== 'CALENDAR_RESERVE' || input.reserveEvidence.status !== 'SUCCEEDED') {
      throw new WorkflowError('Calendar release and reservation evidence are required', 502);
    }
    const technicianId = input.technicianId || appointment.technicianId;
    await lock(tx, `technician:${technicianId}`);
    await assertTechnicianAvailability(tx, { salonId: appointment.salonId, serviceId: appointment.serviceId, technicianId, startTime: input.startTime, endTime: input.endTime, excludeAppointmentId: appointment.id });
    await recordEvidence(tx, appointment.salonId, appointment.id, input.releaseEvidence, `reschedule-release:${input.idempotencyKey}`);
    await recordEvidence(tx, appointment.salonId, appointment.id, input.reserveEvidence, `reschedule-reserve:${input.idempotencyKey}`);
    const updated = await tx.appointment.update({ where: { id: appointment.id }, data: { technicianId, startTime: input.startTime, endTime: input.endTime, version: { increment: 1 } } });
    await appendEvent(tx, { salonId: appointment.salonId, appointmentId: appointment.id, eventType: 'APPOINTMENT_RESCHEDULED', fromStatus: appointment.status, toStatus: appointment.status, actor: input.actor, idempotencyKey: input.idempotencyKey, payload: { fromStartTime: appointment.startTime, toStartTime: input.startTime, fromTechnicianId: appointment.technicianId, toTechnicianId: technicianId } });
    return updated;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function applyPaymentEvidence(input: {
  appointmentId: string;
  evidence: ProviderEvidence;
  idempotencyKey: string;
  actor?: Pick<User, 'id' | 'role'>;
  direction?: 'OUTBOUND' | 'INBOUND_WEBHOOK';
}) {
  if (!['PAYMENT_AUTHORIZE', 'PAYMENT_CAPTURE'].includes(input.evidence.operation)) throw new WorkflowError('Payment evidence operation is invalid', 400);
  return prisma.$transaction(async (tx) => {
    await lock(tx, `appointment:${input.appointmentId}`);
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId } });
    if (!appointment) throw new WorkflowError('Appointment not found', 404);
    const event = await recordEvidence(tx, appointment.salonId, appointment.id, input.evidence, input.idempotencyKey, input.direction);
    const existing = await tx.payment.findUnique({ where: { appointmentId: appointment.id } });
    if (input.evidence.status === 'FAILED') {
      const payment = existing
        ? await tx.payment.update({ where: { id: existing.id }, data: { status: 'FAILED' } })
        : await tx.payment.create({ data: { salonId: appointment.salonId, appointmentId: appointment.id, clientId: appointment.clientId, amount: appointment.totalCents / 100, amountCents: appointment.totalCents, method: 'CARD', status: 'FAILED', provider: input.evidence.provider, providerPaymentId: String(input.evidence.result.paymentId || input.evidence.eventId), idempotencyKey: input.idempotencyKey } });
      await tx.appointment.update({ where: { id: appointment.id }, data: { status: 'EXCEPTION', exceptionCode: 'PAYMENT_FAILED', exceptionReason: String(input.evidence.result.failureReason || 'Provider declined payment'), version: { increment: 1 } } });
      await appendEvent(tx, { salonId: appointment.salonId, appointmentId: appointment.id, eventType: 'PAYMENT_FAILED', fromStatus: appointment.status, toStatus: 'EXCEPTION', actor: input.actor, actorRole: input.direction === 'INBOUND_WEBHOOK' ? 'PROVIDER' : undefined, idempotencyKey: `payment:${input.idempotencyKey}`, payload: { providerEventId: event.id } });
      return payment;
    }
    if (!['AUTHORIZED', 'SUCCEEDED'].includes(input.evidence.status)) throw new WorkflowError('Payment has not been authorized', 409);
    const capturedCents = input.evidence.operation === 'PAYMENT_CAPTURE' && input.evidence.status === 'SUCCEEDED' ? numberFromEvidence(input.evidence, 'amountCents') : 0;
    if (capturedCents > appointment.totalCents) throw new WorkflowError('Captured amount exceeds appointment total');
    const providerPaymentId = String(input.evidence.result.paymentId || '');
    if (!providerPaymentId) throw new WorkflowError('Provider payment identity is missing', 502);
    const recoveringFromFailure = appointment.status === 'EXCEPTION' && appointment.exceptionCode === 'PAYMENT_FAILED';
    const payment = existing
      ? await tx.payment.update({ where: { id: existing.id }, data: { status: capturedCents ? 'COMPLETED' : 'AUTHORIZED', capturedCents, provider: input.evidence.provider, providerPaymentId } })
      : await tx.payment.create({ data: { salonId: appointment.salonId, appointmentId: appointment.id, clientId: appointment.clientId, amount: appointment.totalCents / 100, amountCents: appointment.totalCents, capturedCents, method: 'CARD', status: capturedCents ? 'COMPLETED' : 'AUTHORIZED', provider: input.evidence.provider, providerPaymentId, idempotencyKey: input.idempotencyKey } });
    const toStatus = capturedCents > 0 && (appointment.status === 'BOOKED' || recoveringFromFailure)
      ? 'CONFIRMED'
      : recoveringFromFailure
        ? 'BOOKED'
        : appointment.status;
    if (toStatus !== appointment.status || capturedCents > 0) {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: toStatus,
          depositPaid: capturedCents > 0,
          depositAmount: capturedCents > 0 ? capturedCents / 100 : null,
          exceptionCode: recoveringFromFailure ? null : appointment.exceptionCode,
          exceptionReason: recoveringFromFailure ? null : appointment.exceptionReason,
          version: { increment: 1 },
        },
      });
    }
    await appendEvent(tx, { salonId: appointment.salonId, appointmentId: appointment.id, eventType: capturedCents ? 'PAYMENT_CAPTURED' : 'PAYMENT_AUTHORIZED', fromStatus: appointment.status, toStatus, actor: input.actor, actorRole: input.direction === 'INBOUND_WEBHOOK' ? 'PROVIDER' : undefined, idempotencyKey: `payment:${input.idempotencyKey}`, payload: { providerEventId: event.id, capturedCents } });
    return payment;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function recordTenderPayment(input: {
  appointmentId: string;
  amountCents: number;
  method: 'CASH' | 'GIFT_CARD';
  giftCardId?: string;
  idempotencyKey: string;
  actor: Pick<User, 'id' | 'role'>;
  notes?: string;
}) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new WorkflowError('Positive integer amountCents is required', 400);
  return prisma.$transaction(async (tx) => {
    await lock(tx, `appointment:${input.appointmentId}`);
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId }, include: { payment: true } });
    if (!appointment || ['CANCELLED', 'NO_SHOW'].includes(appointment.status)) throw new WorkflowError('Appointment cannot accept payment');
    const replay = await tx.paymentSplit.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (replay) return appointment.payment;
    const captured = appointment.payment?.capturedCents || 0;
    if (captured + input.amountCents > appointment.totalCents) throw new WorkflowError('Payment exceeds appointment balance');
    let reference: string | undefined;
    if (input.method === 'GIFT_CARD') {
      if (!input.giftCardId) throw new WorkflowError('giftCardId is required', 400);
      await tx.$queryRaw`SELECT id FROM "GiftCard" WHERE id = ${input.giftCardId} FOR UPDATE`;
      const card = await tx.giftCard.findFirst({ where: { id: input.giftCardId, salonId: appointment.salonId, status: 'ACTIVE' } });
      if (!card || Math.round(card.balance * 100) < input.amountCents) throw new WorkflowError('Gift card balance is insufficient');
      const nextBalance = Math.round(card.balance * 100) - input.amountCents;
      await tx.giftCard.update({ where: { id: card.id }, data: { balance: nextBalance / 100, status: nextBalance === 0 ? 'USED' : 'ACTIVE' } });
      reference = card.code;
    }
    const nextCaptured = captured + input.amountCents;
    const payment = appointment.payment
      ? await tx.payment.update({ where: { id: appointment.payment.id }, data: { capturedCents: nextCaptured, amount: appointment.totalCents / 100, amountCents: appointment.totalCents, status: 'COMPLETED', notes: input.notes } })
      : await tx.payment.create({ data: { salonId: appointment.salonId, appointmentId: appointment.id, clientId: appointment.clientId, amount: appointment.totalCents / 100, amountCents: appointment.totalCents, capturedCents: nextCaptured, method: input.method, status: 'COMPLETED', giftCardId: input.giftCardId, idempotencyKey: input.idempotencyKey, notes: input.notes } });
    await tx.paymentSplit.create({ data: { paymentId: payment.id, method: input.method, amount: input.amountCents / 100, reference, idempotencyKey: input.idempotencyKey } });
    const toStatus = appointment.status === 'BOOKED' ? 'CONFIRMED' : appointment.status;
    if (toStatus !== appointment.status) await tx.appointment.update({ where: { id: appointment.id }, data: { status: toStatus, version: { increment: 1 } } });
    await appendEvent(tx, { salonId: appointment.salonId, appointmentId: appointment.id, eventType: `${input.method}_PAYMENT_RECORDED`, fromStatus: appointment.status, toStatus, actor: input.actor, idempotencyKey: `tender:${input.idempotencyKey}`, payload: { amountCents: input.amountCents, paymentId: payment.id } });
    return payment;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function refundPayment(input: { appointmentId: string; amountCents: number; reason: string; evidence: ProviderEvidence; idempotencyKey: string; actor?: Pick<User, 'id' | 'role'>; actorRole?: string; direction?: 'OUTBOUND' | 'INBOUND_WEBHOOK' }) {
  if (input.evidence.operation !== 'PAYMENT_REFUND' || input.evidence.status !== 'SUCCEEDED') throw new WorkflowError('Successful refund evidence is required', 502);
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || !input.reason.trim()) throw new WorkflowError('Positive refund amount and reason are required', 400);
  return prisma.$transaction(async (tx) => {
    await lock(tx, `appointment:${input.appointmentId}`);
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId }, include: { payment: true } });
    if (!appointment?.payment) throw new WorkflowError('Captured payment not found', 404);
    const replay = await tx.paymentRefund.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (replay) return replay;
    const nextRefunded = appointment.payment.refundedCents + input.amountCents;
    const status = nextPaymentStatus(appointment.payment.capturedCents, nextRefunded);
    const providerRefundId = String(input.evidence.result.refundId || '');
    if (!providerRefundId || numberFromEvidence(input.evidence, 'amountCents') !== input.amountCents) throw new WorkflowError('Refund evidence amount or identity is invalid', 502);
    const providerEvent = await recordEvidence(tx, appointment.salonId, appointment.id, input.evidence, input.idempotencyKey, input.direction);
    const refund = await tx.paymentRefund.create({ data: { paymentId: appointment.payment.id, amountCents: input.amountCents, reason: input.reason, provider: input.evidence.provider, providerRefundId, idempotencyKey: input.idempotencyKey, providerEventId: providerEvent.id } });
    await tx.payment.update({ where: { id: appointment.payment.id }, data: { refundedCents: nextRefunded, status } });
    await appendEvent(tx, { salonId: appointment.salonId, appointmentId: appointment.id, eventType: status === 'REFUNDED' ? 'PAYMENT_REFUNDED' : 'PAYMENT_PARTIALLY_REFUNDED', fromStatus: appointment.status, toStatus: appointment.status, actor: input.actor, actorRole: input.actorRole, idempotencyKey: `refund:${input.idempotencyKey}`, payload: { amountCents: input.amountCents, reason: input.reason, providerEventId: providerEvent.id } });
    return refund;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function cancelAppointment(input: { appointmentId: string; reason: string; idempotencyKey: string; calendarEvidence: ProviderEvidence; actor?: Pick<User, 'id' | 'role'>; actorRole?: string }) {
  if (!input.reason?.trim()) throw new WorkflowError('Cancellation reason is required', 400);
  return prisma.$transaction(async (tx) => {
    await lock(tx, `appointment:${input.appointmentId}`);
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId }, include: { payment: true, inventoryReservations: true } });
    if (!appointment) throw new WorkflowError('Appointment not found', 404);
    const replay = await tx.appointmentEvent.findUnique({ where: { appointmentId_idempotencyKey: { appointmentId: appointment.id, idempotencyKey: input.idempotencyKey } } });
    if (replay) return appointment;
    if (appointment.payment && appointment.payment.capturedCents !== appointment.payment.refundedCents) throw new WorkflowError('Captured payment must be fully refunded before cancellation', 409, 'REFUND_REQUIRED');
    if (input.calendarEvidence.operation !== 'CALENDAR_RELEASE' || input.calendarEvidence.status !== 'SUCCEEDED') throw new WorkflowError('Calendar release evidence is required', 502);
    for (const reservation of appointment.inventoryReservations.filter((item) => item.status === 'ACTIVE')) {
      await tx.$queryRaw`SELECT id FROM "InventoryItem" WHERE id = ${reservation.inventoryItemId} FOR UPDATE`;
      await tx.inventoryItem.update({ where: { id: reservation.inventoryItemId }, data: { quantity: { increment: reservation.quantity } } });
      await tx.inventoryReservation.update({ where: { id: reservation.id }, data: { status: 'RELEASED', releasedAt: new Date() } });
      await tx.inventoryTransaction.create({ data: { inventoryItemId: reservation.inventoryItemId, quantityChange: reservation.quantity, reason: `Cancellation ${appointment.appointmentNumber}`, performedBy: input.actor?.id || input.actorRole || 'CUSTOMER' } });
    }
    await recordEvidence(tx, appointment.salonId, appointment.id, input.calendarEvidence, `cancel-calendar:${input.idempotencyKey}`);
    assertAppointmentTransition(appointment.status, 'CANCELLED');
    const updated = await tx.appointment.update({ where: { id: appointment.id }, data: { status: 'CANCELLED', cancellationReason: input.reason, cancelledAt: new Date(), version: { increment: 1 } } });
    await appendEvent(tx, { salonId: appointment.salonId, appointmentId: appointment.id, eventType: 'APPOINTMENT_CANCELLED', fromStatus: appointment.status, toStatus: 'CANCELLED', actor: input.actor, actorRole: input.actorRole, idempotencyKey: input.idempotencyKey, payload: { reason: input.reason } });
    return updated;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function issueInvoice(input: { appointmentId: string; evidence: ProviderEvidence; idempotencyKey: string; actor: Pick<User, 'id' | 'role'> }) {
  if (input.evidence.operation !== 'ACCOUNTING_INVOICE' || input.evidence.status !== 'SUCCEEDED') throw new WorkflowError('Successful accounting invoice evidence is required', 502);
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId }, include: { invoice: true, payment: true } });
    if (!appointment || appointment.status !== 'COMPLETED') throw new WorkflowError('Only completed work can be invoiced');
    if (appointment.invoice) return appointment.invoice;
    const providerInvoiceId = String(input.evidence.result.invoiceId || '');
    if (!providerInvoiceId) throw new WorkflowError('Accounting invoice identity is missing', 502);
    const event = await recordEvidence(tx, appointment.salonId, appointment.id, input.evidence, input.idempotencyKey);
    const paidCents = Math.min(appointment.payment?.capturedCents || 0, appointment.totalCents);
    const invoice = await tx.invoice.create({ data: { invoiceNumber: `I-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`, salonId: appointment.salonId, clientId: appointment.clientId, appointmentId: appointment.id, status: paidCents === appointment.totalCents ? 'PAID' : paidCents ? 'PARTIALLY_PAID' : 'ISSUED', subtotalCents: appointment.serviceCents + appointment.travelCents + appointment.changeOrderCents, taxCents: appointment.taxCents, totalCents: appointment.totalCents, paidCents, provider: input.evidence.provider, providerInvoiceId, issuedAt: new Date(), paidAt: paidCents === appointment.totalCents ? new Date() : undefined } });
    await appendEvent(tx, { salonId: appointment.salonId, appointmentId: appointment.id, eventType: 'INVOICE_ISSUED', fromStatus: appointment.status, toStatus: appointment.status, actor: input.actor, idempotencyKey: input.idempotencyKey, payload: { invoiceId: invoice.id, providerEventId: event.id } });
    return invoice;
  });
}

export async function recordCommunicationEvidence(input: { appointmentId: string; channel: 'SMS' | 'EMAIL'; recipient: string; template: string; body: string; evidence: ProviderEvidence; idempotencyKey: string }) {
  if (input.evidence.operation !== 'MESSAGE' || input.evidence.status !== 'SUCCEEDED') throw new WorkflowError('Successful messaging evidence is required', 502);
  return prisma.$transaction(async (tx) => {
    const replay = await tx.appointmentCommunication.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (replay) {
      if (replay.bodyDigest !== sha256(input.body)) throw new WorkflowError('Message idempotency key was reused with different content');
      return replay;
    }
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId } });
    if (!appointment) throw new WorkflowError('Appointment not found', 404);
    const providerMessageId = String(input.evidence.result.messageId || '');
    if (!providerMessageId) throw new WorkflowError('Provider message identity is missing', 502);
    const event = await recordEvidence(tx, appointment.salonId, appointment.id, input.evidence, input.idempotencyKey);
    const communication = await tx.appointmentCommunication.create({ data: { salonId: appointment.salonId, appointmentId: appointment.id, channel: input.channel, recipient: input.recipient, template: input.template, bodyDigest: sha256(input.body), idempotencyKey: input.idempotencyKey, provider: input.evidence.provider, providerMessageId, status: 'SENT', sentAt: new Date() } });
    await appendEvent(tx, { salonId: appointment.salonId, appointmentId: appointment.id, eventType: 'CUSTOMER_MESSAGE_SENT', fromStatus: appointment.status, toStatus: appointment.status, actorRole: 'SYSTEM', idempotencyKey: `message:${input.idempotencyKey}`, payload: { communicationId: communication.id, providerEventId: event.id, channel: input.channel, template: input.template } });
    return communication;
  });
}

export async function applyOfflineCommand(input: { salonId: string; appointmentId: string; deviceId: string; commandId: string; expectedVersion: number; toStatus: AppointmentStatus; note?: string; actor: Pick<User, 'id' | 'role'> }) {
  const existing = await prisma.offlineCommand.findUnique({ where: { deviceId_commandId: { deviceId: input.deviceId, commandId: input.commandId } } });
  if (existing) return existing;
  const command = await prisma.offlineCommand.create({ data: { salonId: input.salonId, appointmentId: input.appointmentId, deviceId: input.deviceId, commandId: input.commandId, expectedVersion: input.expectedVersion, operation: 'STATUS_TRANSITION', payload: { toStatus: input.toStatus, note: input.note || null } } });
  try {
    await transitionAppointment({ appointmentId: input.appointmentId, toStatus: input.toStatus, idempotencyKey: `offline:${input.deviceId}:${input.commandId}`, expectedVersion: input.expectedVersion, note: input.note, actor: input.actor });
    return prisma.offlineCommand.update({ where: { id: command.id }, data: { status: 'APPLIED', appliedAt: new Date() } });
  } catch (error) {
    const conflict = error instanceof WorkflowError && error.code === 'VERSION_CONFLICT';
    await prisma.offlineCommand.update({ where: { id: command.id }, data: { status: conflict ? 'CONFLICT' : 'FAILED', errorCode: error instanceof WorkflowError ? error.code : 'UNKNOWN' } });
    throw error;
  }
}

export async function verifyAppointmentAudit(appointmentId: string): Promise<boolean> {
  const events = await prisma.appointmentEvent.findMany({ where: { appointmentId }, orderBy: { sequence: 'asc' } });
  let previousHash: string | null = null;
  for (const event of events) {
    const expected = sha256(canonicalJson({ appointmentId: event.appointmentId, sequence: event.sequence, eventType: event.eventType, fromStatus: event.fromStatus, toStatus: event.toStatus, actorId: event.actorId, actorRole: event.actorRole, idempotencyKey: event.idempotencyKey, payload: event.payload, previousHash, occurredAt: event.occurredAt }));
    if (event.previousHash !== previousHash || event.eventHash !== expected) return false;
    previousHash = event.eventHash;
  }
  return true;
}

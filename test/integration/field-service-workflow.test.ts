import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, beforeEach, test } from 'node:test';
import type { Appointment, ProviderOperation } from '@prisma/client';
import prisma from '../../src/lib/prisma';
import { validateProviderEvidence, type ProviderEvidence } from '../../src/lib/field-service/provider';
import {
  applyOfflineCommand,
  applyPaymentEvidence,
  approveChangeOrder,
  bookQuote,
  cancelAppointment,
  createQuote,
  issueInvoice,
  proposeChangeOrder,
  recordCommunicationEvidence,
  recordPartialWork,
  recordTenderPayment,
  reassignTechnician,
  refundPayment,
  rescheduleAppointment,
  transitionAppointment,
  verifyAppointmentAudit,
  WorkflowError,
} from '../../src/lib/field-service/workflow';

process.env.CUSTOMER_ACCESS_SECRET ||= 'integration-customer-secret-at-least-32-bytes';

type Fixture = Awaited<ReturnType<typeof createFixture>>;

function evidence(
  operation: ProviderOperation,
  sourceRef: string,
  result: Record<string, unknown>,
  options: { eventId?: string; status?: ProviderEvidence['status']; provider?: string } = {},
): ProviderEvidence {
  return validateProviderEvidence({
    licensed: true,
    provider: options.provider || 'licensed-test-provider',
    eventId: options.eventId || randomUUID(),
    operation,
    sourceRef,
    status: options.status || 'SUCCEEDED',
    occurredAt: '2026-07-20T12:00:00.000Z',
    result,
  }, { operation, sourceRef });
}

function nextWorkingSlot(hoursFromNoon = 0): Date {
  const slot = new Date();
  slot.setUTCDate(slot.getUTCDate() + 2);
  slot.setUTCHours(12 + hoursFromNoon, 0, 0, 0);
  return slot;
}

async function createFixture() {
  const salon = await prisma.salon.create({ data: { name: 'Test Salon', address: '1 Main St', phone: '+12025550100', email: `salon-${randomUUID()}@example.test`, timezone: 'UTC' } });
  const owner = await prisma.user.create({ data: { salonId: salon.id, name: 'Owner', email: `owner-${randomUUID()}@example.test`, hashedPassword: 'not-used-in-tests', role: 'OWNER', active: true, emailVerified: true } });
  const technician = await prisma.user.create({ data: { salonId: salon.id, name: 'Tech One', email: `tech1-${randomUUID()}@example.test`, hashedPassword: 'not-used-in-tests', role: 'TECHNICIAN', active: true, emailVerified: true } });
  const technician2 = await prisma.user.create({ data: { salonId: salon.id, name: 'Tech Two', email: `tech2-${randomUUID()}@example.test`, hashedPassword: 'not-used-in-tests', role: 'TECHNICIAN', active: true, emailVerified: true } });
  const client = await prisma.client.create({ data: { salonId: salon.id, name: 'Customer', phone: `+1${Math.floor(1_000_000_000 + Math.random() * 8_000_000_000)}`, email: `client-${randomUUID()}@example.test` } });
  const service = await prisma.service.create({ data: { salonId: salon.id, name: 'Field Service', durationMinutes: 60, basePrice: 100, category: 'OTHER', active: true } });
  const inventory = await prisma.inventoryItem.create({ data: { salonId: salon.id, name: 'Service Kit', category: 'OTHER', quantity: 20, minQuantity: 2, active: true } });
  await prisma.serviceInventoryRequirement.create({ data: { serviceId: service.id, inventoryItemId: inventory.id, quantity: 2 } });
  await prisma.serviceSkillRequirement.create({ data: { serviceId: service.id, skillName: 'field-service', minLevel: 'ADVANCED', certified: true } });
  await prisma.technicianSkill.createMany({ data: [
    { salonId: salon.id, technicianId: technician.id, skillName: 'field-service', level: 'EXPERT', certified: true },
    { salonId: salon.id, technicianId: technician2.id, skillName: 'field-service', level: 'EXPERT', certified: true },
  ] });
  const dayOfWeek = nextWorkingSlot().getUTCDay();
  await prisma.staffSchedule.createMany({ data: [
    { salonId: salon.id, technicianId: technician.id, dayOfWeek, startTime: '00:00', endTime: '23:59', isWorking: true },
    { salonId: salon.id, technicianId: technician2.id, dayOfWeek, startTime: '00:00', endTime: '23:59', isWorking: true },
  ] });
  const station1 = await prisma.station.create({ data: { salonId: salon.id, name: 'Mobile Unit 1', active: true } });
  const station2 = await prisma.station.create({ data: { salonId: salon.id, name: 'Mobile Unit 2', active: true } });
  await prisma.stationAssignment.createMany({ data: [
    { stationId: station1.id, technicianId: technician.id, dayOfWeek },
    { stationId: station2.id, technicianId: technician2.id, dayOfWeek },
  ] });
  return { salon, owner, technician, technician2, client, service, inventory };
}

async function quote(fixture: Fixture, key: string, technicianId?: string) {
  return createQuote({
    salonId: fixture.salon.id,
    clientId: fixture.client.id,
    serviceId: fixture.service.id,
    technicianId,
    idempotencyKey: key,
    taxEvidence: evidence('TAX_QUOTE', `quote:${key}`, { taxCents: 800 }, { eventId: `tax-${key}` }),
  });
}

async function booking(fixture: Fixture, key: string, startTime = nextWorkingSlot(), technicianId = fixture.technician.id) {
  const offered = await quote(fixture, `quote-${key}`, technicianId);
  return bookQuote({
    quoteId: offered.id,
    technicianId,
    startTime,
    idempotencyKey: `book-${key}`,
    calendarEvidence: evidence('CALENDAR_RESERVE', offered.quoteNumber, { reservationId: `calendar-${key}` }, { eventId: `calendar-${key}` }),
  });
}

function workflowCode(code: string) {
  return (error: unknown) => error instanceof WorkflowError && error.code === code;
}

before(() => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must target the isolated integration database');
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Salon" CASCADE');
});

test('quote and booking idempotency is exact, and concurrent overlap is rejected', async () => {
  const fixture = await createFixture();
  const offered = await quote(fixture, 'idem-quote', fixture.technician.id);
  const replay = await quote(fixture, 'idem-quote', fixture.technician.id);
  assert.equal(replay.id, offered.id);
  await assert.rejects(() => createQuote({
    salonId: fixture.salon.id,
    clientId: fixture.client.id,
    serviceId: fixture.service.id,
    technicianId: fixture.technician2.id,
    idempotencyKey: 'idem-quote',
    taxEvidence: evidence('TAX_QUOTE', 'quote:idem-quote', { taxCents: 800 }, { eventId: 'tax-idem-quote' }),
  }), workflowCode('WORKFLOW_CONFLICT'));

  const startTime = nextWorkingSlot();
  const quoteA = await quote(fixture, 'concurrent-a', fixture.technician.id);
  const quoteB = await quote(fixture, 'concurrent-b', fixture.technician.id);
  const attempts = await Promise.allSettled([
    bookQuote({ quoteId: quoteA.id, technicianId: fixture.technician.id, startTime, idempotencyKey: 'concurrent-book-a', calendarEvidence: evidence('CALENDAR_RESERVE', quoteA.quoteNumber, { reservationId: 'a' }, { eventId: 'calendar-a' }) }),
    bookQuote({ quoteId: quoteB.id, technicianId: fixture.technician.id, startTime: new Date(startTime.getTime() + 30 * 60_000), idempotencyKey: 'concurrent-book-b', calendarEvidence: evidence('CALENDAR_RESERVE', quoteB.quoteNumber, { reservationId: 'b' }, { eventId: 'calendar-b' }) }),
  ]);
  assert.equal(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
  const rejected = attempts.find((attempt) => attempt.status === 'rejected');
  assert.ok(rejected?.status === 'rejected' && workflowCode('OVERBOOKING')(rejected.reason));

  const winner = attempts.find((attempt) => attempt.status === 'fulfilled');
  assert.ok(winner?.status === 'fulfilled');
  const winnerInput = winner.value.startTime.getTime() === startTime.getTime()
    ? { quote: quoteA, key: 'concurrent-book-a', eventId: 'calendar-a' }
    : { quote: quoteB, key: 'concurrent-book-b', eventId: 'calendar-b' };
  const exactReplay = await bookQuote({ quoteId: winnerInput.quote.id, technicianId: fixture.technician.id, startTime: winner.value.startTime, idempotencyKey: winnerInput.key, calendarEvidence: evidence('CALENDAR_RESERVE', winnerInput.quote.quoteNumber, { reservationId: winnerInput.eventId === 'calendar-a' ? 'a' : 'b' }, { eventId: winnerInput.eventId }) });
  assert.equal(exactReplay.id, winner.value.id);
});

test('inventory oversell and incompatible skills fail before a booking is committed', async () => {
  const fixture = await createFixture();
  await prisma.inventoryItem.update({ where: { id: fixture.inventory.id }, data: { quantity: 1 } });
  const offered = await quote(fixture, 'inventory', fixture.technician.id);
  await assert.rejects(() => bookQuote({ quoteId: offered.id, technicianId: fixture.technician.id, startTime: nextWorkingSlot(), idempotencyKey: 'book-inventory', calendarEvidence: evidence('CALENDAR_RESERVE', offered.quoteNumber, { reservationId: 'inventory' }) }), workflowCode('INSUFFICIENT_INVENTORY'));
  assert.equal(await prisma.appointment.count(), 0);
  assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: fixture.inventory.id } })).quantity, 1);

  await prisma.inventoryItem.update({ where: { id: fixture.inventory.id }, data: { quantity: 20 } });
  await prisma.technicianSkill.update({ where: { technicianId_skillName: { technicianId: fixture.technician.id, skillName: 'field-service' } }, data: { certified: false } });
  const skillQuote = await quote(fixture, 'skill', fixture.technician.id);
  await assert.rejects(() => bookQuote({ quoteId: skillQuote.id, technicianId: fixture.technician.id, startTime: nextWorkingSlot(), idempotencyKey: 'book-skill', calendarEvidence: evidence('CALENDAR_RESERVE', skillQuote.quoteNumber, { reservationId: 'skill' }) }), workflowCode('SKILL_MISMATCH'));
});

test('full job, recovery, change order, invoice, refund, messaging, and offline conflict are auditable', async () => {
  const fixture = await createFixture();
  const actor = { id: fixture.owner.id, role: fixture.owner.role };
  let appointment: Appointment = await booking(fixture, 'lifecycle');

  const moved = await rescheduleAppointment({
    appointmentId: appointment.id,
    technicianId: fixture.technician.id,
    startTime: nextWorkingSlot(2),
    endTime: nextWorkingSlot(3),
    releaseEvidence: evidence('CALENDAR_RELEASE', appointment.appointmentNumber, { released: true }),
    reserveEvidence: evidence('CALENDAR_RESERVE', appointment.appointmentNumber, { reservationId: 'rescheduled' }),
    actor,
    idempotencyKey: 'reschedule-lifecycle',
  });
  appointment = await reassignTechnician({ appointmentId: moved.id, technicianId: fixture.technician2.id, actor, idempotencyKey: 'reassign-lifecycle' });

  const change = await proposeChangeOrder({ appointmentId: appointment.id, description: 'Additional treatment', amountCents: 2_000, durationDeltaMinutes: 30, requestedBy: fixture.owner.id });
  appointment = await approveChangeOrder({ changeOrderId: change.id, approvedBy: fixture.client.id, idempotencyKey: 'approve-change', taxEvidence: evidence('TAX_QUOTE', `change:${change.id}`, { taxCents: 960 }) });
  assert.equal(appointment.totalCents, 12_960);

  await applyPaymentEvidence({ appointmentId: appointment.id, evidence: evidence('PAYMENT_CAPTURE', appointment.appointmentNumber, { paymentId: 'payment-main', failureReason: 'declined' }, { status: 'FAILED', eventId: 'payment-failed' }), idempotencyKey: 'payment-failed', actor });
  assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } })).status, 'EXCEPTION');
  const payment = await applyPaymentEvidence({ appointmentId: appointment.id, evidence: evidence('PAYMENT_CAPTURE', appointment.appointmentNumber, { paymentId: 'payment-main', amountCents: appointment.totalCents }, { eventId: 'payment-recovered' }), idempotencyKey: 'payment-recovered', actor });
  assert.equal(payment.capturedCents, appointment.totalCents);
  appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
  assert.equal(appointment.status, 'CONFIRMED');
  assert.equal(appointment.exceptionCode, null);

  await assert.rejects(() => applyOfflineCommand({ salonId: fixture.salon.id, appointmentId: appointment.id, deviceId: 'device-1', commandId: 'stale-command', expectedVersion: appointment.version - 1, toStatus: 'DISPATCHED', actor }), workflowCode('VERSION_CONFLICT'));
  assert.equal((await prisma.offlineCommand.findUniqueOrThrow({ where: { deviceId_commandId: { deviceId: 'device-1', commandId: 'stale-command' } } })).status, 'CONFLICT');

  appointment = await transitionAppointment({ appointmentId: appointment.id, toStatus: 'DISPATCHED', idempotencyKey: 'dispatch', expectedVersion: appointment.version, actor });
  appointment = await transitionAppointment({ appointmentId: appointment.id, toStatus: 'EN_ROUTE', idempotencyKey: 'en-route', actor });
  appointment = await transitionAppointment({ appointmentId: appointment.id, toStatus: 'IN_PROGRESS', idempotencyKey: 'start-work', actor });
  appointment = await recordPartialWork({ appointmentId: appointment.id, quantity: 1, notes: 'First stage completed', idempotencyKey: 'partial-work', actor });
  assert.equal(appointment.status, 'PARTIALLY_COMPLETED');
  appointment = await transitionAppointment({ appointmentId: appointment.id, toStatus: 'COMPLETED', idempotencyKey: 'complete', actor });

  const invoice = await issueInvoice({ appointmentId: appointment.id, evidence: evidence('ACCOUNTING_INVOICE', appointment.appointmentNumber, { invoiceId: 'accounting-invoice-1' }), idempotencyKey: 'invoice', actor });
  assert.equal(invoice.status, 'PAID');
  const firstRefund = await refundPayment({ appointmentId: appointment.id, amountCents: 1_000, reason: 'Courtesy adjustment', evidence: evidence('PAYMENT_REFUND', appointment.appointmentNumber, { refundId: 'refund-1', amountCents: 1_000 }), idempotencyKey: 'refund-1', actor });
  assert.equal(firstRefund.amountCents, 1_000);
  await refundPayment({ appointmentId: appointment.id, amountCents: appointment.totalCents - 1_000, reason: 'Remainder returned', evidence: evidence('PAYMENT_REFUND', appointment.appointmentNumber, { refundId: 'refund-2', amountCents: appointment.totalCents - 1_000 }), idempotencyKey: 'refund-2', actor });
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { appointmentId: appointment.id } })).status, 'REFUNDED');

  await recordCommunicationEvidence({ appointmentId: appointment.id, channel: 'SMS', recipient: fixture.client.phone, template: 'receipt', body: 'Your receipt is ready.', evidence: evidence('MESSAGE', appointment.appointmentNumber, { messageId: 'message-1' }), idempotencyKey: 'message-1' });
  assert.equal(await verifyAppointmentAudit(appointment.id), true);
  await assert.rejects(() => prisma.changeOrder.update({ where: { id: change.id }, data: { amountCents: 1 } }));
  const event = await prisma.appointmentEvent.findFirstOrThrow({ where: { appointmentId: appointment.id } });
  await assert.rejects(() => prisma.appointmentEvent.delete({ where: { id: event.id } }));

  const altered = evidence('PAYMENT_CAPTURE', appointment.appointmentNumber, { paymentId: 'payment-main', amountCents: 1 }, { eventId: 'payment-recovered' });
  await assert.rejects(() => applyPaymentEvidence({ appointmentId: appointment.id, evidence: altered, idempotencyKey: 'altered-replay', actor }), workflowCode('ALTERED_PROVIDER_REPLAY'));
});

test('cancellation requires refunds, is replay-safe, and no-shows release inventory once', async () => {
  const fixture = await createFixture();
  const actor = { id: fixture.owner.id, role: fixture.owner.role };
  let cancelled: Appointment = await booking(fixture, 'cancel', nextWorkingSlot(), fixture.technician.id);
  await applyPaymentEvidence({ appointmentId: cancelled.id, evidence: evidence('PAYMENT_CAPTURE', cancelled.appointmentNumber, { paymentId: 'cancel-payment', amountCents: cancelled.totalCents }), idempotencyKey: 'cancel-payment', actor });
  const release = evidence('CALENDAR_RELEASE', cancelled.appointmentNumber, { released: true }, { eventId: 'cancel-calendar' });
  await assert.rejects(() => cancelAppointment({ appointmentId: cancelled.id, reason: 'Customer request', idempotencyKey: 'cancel', calendarEvidence: release, actor }), workflowCode('REFUND_REQUIRED'));
  await refundPayment({ appointmentId: cancelled.id, amountCents: cancelled.totalCents, reason: 'Cancellation', evidence: evidence('PAYMENT_REFUND', cancelled.appointmentNumber, { refundId: 'cancel-refund', amountCents: cancelled.totalCents }), idempotencyKey: 'cancel-refund', actor });
  cancelled = await cancelAppointment({ appointmentId: cancelled.id, reason: 'Customer request', idempotencyKey: 'cancel', calendarEvidence: release, actor });
  assert.equal(cancelled.status, 'CANCELLED');
  const inventoryAfterCancel = (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: fixture.inventory.id } })).quantity;
  await cancelAppointment({ appointmentId: cancelled.id, reason: 'Customer request', idempotencyKey: 'cancel', calendarEvidence: release, actor });
  assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: fixture.inventory.id } })).quantity, inventoryAfterCancel);

  let noShow: Appointment = await booking(fixture, 'no-show', nextWorkingSlot(2), fixture.technician.id);
  await recordTenderPayment({ appointmentId: noShow.id, amountCents: noShow.totalCents, method: 'CASH', idempotencyKey: 'cash-no-show', actor });
  noShow = await prisma.appointment.findUniqueOrThrow({ where: { id: noShow.id } });
  noShow = await transitionAppointment({ appointmentId: noShow.id, toStatus: 'NO_SHOW', idempotencyKey: 'no-show', actor });
  assert.equal(noShow.status, 'NO_SHOW');
  assert.equal((await prisma.inventoryReservation.findFirstOrThrow({ where: { appointmentId: noShow.id } })).status, 'RELEASED');
  await assert.rejects(() => prisma.inventoryItem.update({ where: { id: fixture.inventory.id }, data: { quantity: -1 } }));
});

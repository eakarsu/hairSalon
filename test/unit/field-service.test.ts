import assert from 'node:assert/strict';
import { test } from 'node:test';
import { digestJson } from '../../src/lib/field-service/canonical';
import { validateProviderEvidence } from '../../src/lib/field-service/provider';
import { assertAppointmentTransition, nextPaymentStatus } from '../../src/lib/field-service/state-machine';

test('provider evidence must be licensed and bound to its operation and source', () => {
  const raw = {
    licensed: true,
    provider: 'licensed-test-provider',
    eventId: 'event-1',
    operation: 'TAX_QUOTE',
    sourceRef: 'quote:key-1',
    status: 'SUCCEEDED',
    occurredAt: new Date().toISOString(),
    result: { taxCents: 825 },
  };
  const evidence = validateProviderEvidence(raw, { operation: 'TAX_QUOTE', sourceRef: 'quote:key-1' });
  assert.equal(evidence.payloadDigest, digestJson(raw));
  assert.throws(() => validateProviderEvidence(raw, { operation: 'PAYMENT_CAPTURE', sourceRef: 'quote:key-1' }));
  assert.throws(() => validateProviderEvidence({ ...raw, licensed: false }, { operation: 'TAX_QUOTE', sourceRef: 'quote:key-1' }));
});

test('appointment and refund state rules reject invalid movement', () => {
  assert.doesNotThrow(() => assertAppointmentTransition('CONFIRMED', 'DISPATCHED'));
  assert.throws(() => assertAppointmentTransition('COMPLETED', 'IN_PROGRESS'));
  assert.equal(nextPaymentStatus(10_000, 2_500), 'PARTIALLY_REFUNDED');
  assert.equal(nextPaymentStatus(10_000, 10_000), 'REFUNDED');
  assert.throws(() => nextPaymentStatus(10_000, 10_001));
});

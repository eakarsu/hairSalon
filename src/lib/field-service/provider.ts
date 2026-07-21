import type { ProviderOperation } from '@prisma/client';
import { digestJson, requireSecret, verifyHmac } from './canonical';

export interface ProviderEvidence {
  licensed: true;
  provider: string;
  eventId: string;
  operation: ProviderOperation;
  sourceRef: string;
  status: 'PENDING' | 'AUTHORIZED' | 'SUCCEEDED' | 'FAILED';
  occurredAt: Date;
  result: Record<string, unknown>;
  payload: Record<string, unknown>;
  payloadDigest: string;
}

const providerPrefix: Record<ProviderOperation, string> = {
  MAP_ROUTE: 'MAP',
  CALENDAR_RESERVE: 'CALENDAR',
  CALENDAR_RELEASE: 'CALENDAR',
  MESSAGE: 'MESSAGE',
  TAX_QUOTE: 'TAX',
  PAYMENT_AUTHORIZE: 'PAYMENT',
  PAYMENT_CAPTURE: 'PAYMENT',
  PAYMENT_REFUND: 'PAYMENT',
  ACCOUNTING_INVOICE: 'ACCOUNTING',
  ACCOUNTING_PAYMENT: 'ACCOUNTING',
};

export function validateProviderEvidence(raw: unknown, expected: { operation: ProviderOperation; sourceRef: string }): ProviderEvidence {
  const value = raw as Record<string, unknown>;
  if (!value || value.licensed !== true || typeof value.provider !== 'string' || typeof value.eventId !== 'string') {
    throw new Error('Provider evidence is incomplete or unlicensed');
  }
  if (value.operation !== expected.operation || value.sourceRef !== expected.sourceRef) {
    throw new Error('Provider evidence does not match the requested operation');
  }
  if (!['PENDING', 'AUTHORIZED', 'SUCCEEDED', 'FAILED'].includes(String(value.status))) {
    throw new Error('Provider evidence status is invalid');
  }
  const occurredAt = new Date(String(value.occurredAt));
  if (Number.isNaN(occurredAt.getTime()) || !value.result || typeof value.result !== 'object' || Array.isArray(value.result)) {
    throw new Error('Provider evidence result or timestamp is invalid');
  }
  return {
    licensed: true,
    provider: value.provider,
    eventId: value.eventId,
    operation: value.operation as ProviderOperation,
    sourceRef: value.sourceRef as string,
    status: value.status as ProviderEvidence['status'],
    occurredAt,
    result: value.result as Record<string, unknown>,
    payload: value,
    payloadDigest: digestJson(value),
  };
}

export async function callFieldProvider(
  operation: ProviderOperation,
  input: { sourceRef: string; idempotencyKey: string; payload: Record<string, unknown> }
): Promise<ProviderEvidence> {
  const prefix = providerPrefix[operation];
  const url = requireSecret(`${prefix}_PROVIDER_URL`);
  const token = requireSecret(`${prefix}_PROVIDER_TOKEN`);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'idempotency-key': input.idempotencyKey,
      },
      body: JSON.stringify({ operation, sourceRef: input.sourceRef, ...input.payload }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new Error(`${prefix} provider unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw new Error(`${prefix} provider returned HTTP ${response.status}`);
  return validateProviderEvidence(await response.json(), { operation, sourceRef: input.sourceRef });
}

export function verifyFieldWebhook(body: Buffer, signature: string | null): boolean {
  return verifyHmac(body, signature, requireSecret('FIELD_WEBHOOK_SECRET', 32));
}

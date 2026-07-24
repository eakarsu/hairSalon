import assert from 'node:assert/strict';
import test from 'node:test';

import { requestAppointmentReadiness } from '../../src/lib/openrouter';

test('OpenRouter response includes substantive content and provider receipt', async () => {
  const originalFetch = globalThis.fetch;
  process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODEL = 'test-model';
  globalThis.fetch = async (_input, init) => {
    assert.match(JSON.stringify(init?.headers), /Bearer test-key/);
    return new Response(JSON.stringify({
      id: 'generation-123',
      model: 'provider/test-model',
      choices: [{ message: { content: 'Verify technician qualification; reserve inventory; capture customer approval.' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const evidence = await requestAppointmentReadiness('Mobile color appointment and customer sign-off');
    assert.equal(evidence.providerReceipt.requestId, 'generation-123');
    assert.match(evidence.result, /reserve inventory/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenRouter integration rejects noncanonical base URL', async () => {
  process.env.OPENROUTER_BASE_URL = 'https://example.invalid/api/v1';
  await assert.rejects(
    () => requestAppointmentReadiness('Mobile color appointment and customer sign-off'),
    /canonical OpenRouter API endpoint/,
  );
});

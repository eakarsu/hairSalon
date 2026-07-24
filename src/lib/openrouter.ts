const CANONICAL_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

interface OpenRouterPayload {
  id?: unknown;
  model?: unknown;
  choices?: Array<{ message?: { content?: unknown } }>;
}

export interface OpenRouterEvidence {
  result: string;
  providerReceipt: {
    provider: 'openrouter';
    requestId: string;
    model: string;
    completedAt: string;
  };
}

export async function requestAppointmentReadiness(appointmentSummary: string): Promise<OpenRouterEvidence> {
  const baseUrl = (process.env.OPENROUTER_BASE_URL || CANONICAL_OPENROUTER_BASE_URL).replace(/\/$/, '');
  if (baseUrl !== CANONICAL_OPENROUTER_BASE_URL) {
    throw new Error('OPENROUTER_BASE_URL must use the canonical OpenRouter API endpoint');
  }
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  if (!apiKey || !model) throw new Error('OpenRouter credentials and model must be configured');

  const response = await fetch(`${CANONICAL_OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://127.0.0.1',
      'X-Title': 'SalonFlow Appointment Readiness',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: 'You are a salon field-service operations reviewer. Give concise controls and never invent provider or customer evidence.',
        },
        {
          role: 'user',
          content: `Review this appointment workflow: ${appointmentSummary}. Return exactly three short controls covering technician qualification, inventory readiness, and customer approval.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json().catch(() => null) as OpenRouterPayload | null;
  if (!response.ok) throw new Error(`OpenRouter request failed with status ${response.status}`);

  const requestId = typeof payload?.id === 'string' ? payload.id.trim() : '';
  const providerModel = typeof payload?.model === 'string' ? payload.model.trim() : '';
  const result = typeof payload?.choices?.[0]?.message?.content === 'string'
    ? payload.choices[0].message.content.trim()
    : '';
  if (!requestId || !providerModel || result.length < 40) {
    throw new Error('OpenRouter response did not include substantive provider evidence');
  }
  return {
    result,
    providerReceipt: {
      provider: 'openrouter',
      requestId,
      model: providerModel,
      completedAt: new Date().toISOString(),
    },
  };
}

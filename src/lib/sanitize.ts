// Input sanitization and validation middleware

/**
 * Sanitize a string to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Strip HTML tags from input
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize an object's string fields recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = stripHtml(value).trim();
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  return sanitized;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
  const cleaned = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : null;
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+()-\s]/g, '').trim();
  return cleaned.length >= 7 ? cleaned : null;
}

/**
 * Validate that an ID is a valid CUID format
 */
export function isValidId(id: string): boolean {
  return /^c[a-z0-9]{24}$/.test(id);
}

/**
 * Middleware-style request body sanitizer
 */
export async function sanitizeRequestBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json();
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid request body');
  }
  return sanitizeObject(body as Record<string, unknown>);
}

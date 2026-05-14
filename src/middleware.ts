import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limit store for middleware
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  return `${ip}:${request.nextUrl.pathname}`;
}

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function applyCors(res: NextResponse, origin: string | null) {
  const allow =
    ALLOWED_ORIGINS.includes('*') ||
    (origin && ALLOWED_ORIGINS.includes(origin));
  if (allow && origin) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  } else if (ALLOWED_ORIGINS.includes('*')) {
    res.headers.set('Access-Control-Allow-Origin', '*');
  }
  res.headers.set(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,PATCH,OPTIONS'
  );
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Api-Key, X-User-Id, X-Twilio-Signature, Stripe-Signature'
  );
  res.headers.set('Access-Control-Max-Age', '86400');
  res.headers.set('Vary', 'Origin');
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(self), payment=(self)'
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set(
    'Content-Security-Policy',
    process.env.CSP_HEADER ||
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://openrouter.ai https://api.stripe.com wss: ws:; frame-src https://js.stripe.com; frame-ancestors 'none'"
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // CORS preflight
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const res = new NextResponse(null, { status: 204 });
    applyCors(res, origin);
    applySecurityHeaders(res);
    return res;
  }

  const response = NextResponse.next();

  applyCors(response, origin);
  applySecurityHeaders(response);

  // --- Rate Limiting ---
  if (pathname.startsWith('/api/')) {
    const rateLimitKey = getRateLimitKey(request);

    // Stricter limits for auth endpoints
    if (pathname.startsWith('/api/auth/register') || pathname.startsWith('/api/auth/forgot-password')) {
      if (!checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)) {
        const r = NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': '900' } }
        );
        applyCors(r, origin);
        applySecurityHeaders(r);
        return r;
      }
    }
    // Standard API rate limit
    else {
      if (!checkRateLimit(rateLimitKey, 100, 60 * 1000)) {
        const r = NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        );
        applyCors(r, origin);
        applySecurityHeaders(r);
        return r;
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
};

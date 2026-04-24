// In-memory rate limiter for API routes
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs?: number;  // Time window in milliseconds
  max?: number;       // Max requests per window
}

export function rateLimit(options: RateLimitOptions = {}) {
  const { windowMs = 60 * 1000, max = 60 } = options;

  return {
    check: (identifier: string): { success: boolean; remaining: number; resetIn: number } => {
      const now = Date.now();
      const key = identifier;
      const entry = rateLimitMap.get(key);

      if (!entry || now > entry.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
        return { success: true, remaining: max - 1, resetIn: windowMs };
      }

      if (entry.count >= max) {
        return { success: false, remaining: 0, resetIn: entry.resetTime - now };
      }

      entry.count++;
      return { success: true, remaining: max - entry.count, resetIn: entry.resetTime - now };
    },
  };
}

// Pre-configured limiters
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }); // 10 per 15 min
export const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 });       // 100 per min
export const exportLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });      // 5 per min

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 1000);

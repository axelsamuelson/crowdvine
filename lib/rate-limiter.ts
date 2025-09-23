// Rate limiting utility for API endpoints
// Simple in-memory rate limiter (for production, consider using Redis)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs; // 15 minutes default
    this.maxRequests = maxRequests; // 100 requests per window default
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      // No entry or window expired, create new entry
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.requests.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(identifier: string): number {
    const entry = this.requests.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.windowMs;
    }
    return entry.resetTime;
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Create rate limiters for different endpoints
export const accessRequestLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes
export const signupLimiter = new RateLimiter(60 * 60 * 1000, 3); // 3 requests per hour
export const generalLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes

// Helper function to get client identifier
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (for different deployment scenarios)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ip = forwarded?.split(",")[0] || realIp || cfConnectingIp || "unknown";

  // For development, use a more permissive identifier
  if (process.env.NODE_ENV === "development") {
    return "dev-client";
  }

  return ip;
}

// Rate limiting middleware
export function withRateLimit(
  limiter: RateLimiter,
  errorMessage: string = "Too many requests. Please try again later.",
) {
  return function (handler: Function) {
    return async function (request: Request, ...args: any[]) {
      const identifier = getClientIdentifier(request);

      if (!limiter.isAllowed(identifier)) {
        const resetTime = limiter.getResetTime(identifier);
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

        return new Response(
          JSON.stringify({
            error: errorMessage,
            retryAfter: retryAfter,
            resetTime: new Date(resetTime).toISOString(),
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": retryAfter.toString(),
              "X-RateLimit-Limit": limiter.maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": resetTime.toString(),
            },
          },
        );
      }

      // Add rate limit headers to successful responses
      const response = await handler(request, ...args);
      const remaining = limiter.getRemainingRequests(identifier);
      const resetTime = limiter.getResetTime(identifier);

      if (response instanceof Response) {
        response.headers.set(
          "X-RateLimit-Limit",
          limiter.maxRequests.toString(),
        );
        response.headers.set("X-RateLimit-Remaining", remaining.toString());
        response.headers.set("X-RateLimit-Reset", resetTime.toString());
      }

      return response;
    };
  };
}

// Cleanup expired entries every 5 minutes
setInterval(
  () => {
    accessRequestLimiter.cleanup();
    signupLimiter.cleanup();
    generalLimiter.cleanup();
  },
  5 * 60 * 1000,
);

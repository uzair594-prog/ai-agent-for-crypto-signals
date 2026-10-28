import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";

let limiter: Ratelimit | undefined;

function getLimiter() {
  if (limiter) return limiter;
  const url = process.env.RATE_LIMIT_REDIS_URL;
  const token = process.env.RATE_LIMIT_REDIS_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") throw new Error("Distributed rate limiting is not configured");
    return null;
  }
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "auth:rate",
    analytics: false,
  });
  return limiter;
}

export async function checkAuthRateLimit(identifier: string) {
  const service = getLimiter();
  if (!service) return { success: true, remaining: 5 };
  const key = createHash("sha256").update(identifier).digest("hex");
  return service.limit(key);
}

export function requestFingerprint(request: Request, identity = "") {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${forwarded}:${identity.toLowerCase()}`;
}

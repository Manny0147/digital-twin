import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn(
    "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set. Rate limits are still enforced, but only inside each server instance."
  );
}

function makeLimiter(prefix: string, requests: number, window: string) {
  if (!redis) {
    // Fallback in-memory for local/dev when Upstash is not configured
    const hits = new Map<string, { count: number; reset: number }>();
    return {
      async limit(key: string) {
        const now = Date.now();
        const rec = hits.get(key);
        if (!rec || rec.reset < now) {
          hits.set(key, { count: 1, reset: now + 60_000 });
          return { success: true, limit: requests, remaining: requests - 1, reset: now + 60_000 };
        }
        if (rec.count >= requests) {
          return { success: false, limit: requests, remaining: 0, reset: rec.reset };
        }
        rec.count += 1;
        return { success: true, limit: requests, remaining: requests - rec.count, reset: rec.reset };
      },
    };
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window as "60 s"),
    prefix,
  });
}

export const limiters = {
  chat: makeLimiter("rl:chat", 20, "60 s"),
  memory: makeLimiter("rl:memory", 30, "60 s"),
  decrypt: makeLimiter("rl:decrypt", 5, "60 s"),
  grant: makeLimiter("rl:grant", 10, "60 s"),
  publicToken: makeLimiter("rl:public:token", 20, "60 s"),
  publicIp: makeLimiter("rl:public:ip", 60, "60 s"),
};

export async function assertWithinLimit(
  limiter: { limit: (key: string) => Promise<{ success: boolean }> },
  key: string
) {
  const result = await limiter.limit(key);
  if (!result.success) {
    throw new Error("Rate limited");
  }
  return result;
}

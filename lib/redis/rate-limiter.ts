import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./client";

/**
 * 🔒 Enterprise Upstash Sliding Window General Rate Limiters
 */

// 1. Post Creation Gate (Max 5 posts per minute per user)
export const postRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  prefix: "ratelimit:posts",
});

// 2. Auth & Login Gate (Max 5 attempts per 10 minutes per IP/User to prevent brute-force)
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  analytics: true,
  prefix: "ratelimit:auth",
});

// 3. Comments & Reactions Gate (Max 30 actions per minute)
export const commentRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
  prefix: "ratelimit:comments",
});

// 4. Direct Messaging Gate (Max 20 messages per minute)
export const messageRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "ratelimit:messages",
});

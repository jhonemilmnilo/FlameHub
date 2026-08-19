import { Redis } from "@upstash/redis";

/**
 * ⚡ Global Upstash Redis Client Singleton
 * Connects via HTTP REST (Zero connection pool exhaustion on serverless/Next.js).
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

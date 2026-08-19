import { redis } from "./client";
import { prisma } from "@/lib/prisma";

const SETTINGS_CACHE_PREFIX = "cache:system_settings:";
const DEFAULT_TTL_SECONDS = 3600; // 1 hour cache

/**
 * ⚡ High-Performance Cached System Settings
 *
 * Reads from Upstash Redis first (0ms latency).
 * Falls back to PostgreSQL `SystemSetting` table and populates the Redis cache.
 */

export async function getSystemSetting<T = unknown>(key: string, defaultValue?: T): Promise<T | null> {
  const cacheKey = `${SETTINGS_CACHE_PREFIX}${key}`;

  try {
    // 1. Fast Cache Hit via Redis
    const cached = await redis.get<T>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // 2. Cache Miss: Query Postgres
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return defaultValue ?? null;
    }

    const value = setting.value as T;

    // 3. Populate Redis cache with TTL
    await redis.set(cacheKey, value, { ex: DEFAULT_TTL_SECONDS });

    return value;
  } catch (error) {
    console.error(`SYSTEM_SETTING_GET_ERROR [${key}]:`, error);
    return defaultValue ?? null;
  }
}

/**
 * 🔄 Set System Setting & Invalidate/Update Redis Cache
 */
export async function setSystemSetting<T = unknown>(
  key: string,
  value: T,
  description?: string
): Promise<void> {
  const cacheKey = `${SETTINGS_CACHE_PREFIX}${key}`;

  try {
    // 1. Upsert in Postgres DB
    await prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value: value as object,
        description,
      },
      update: {
        value: value as object,
        description,
      },
    });

    // 2. Update Redis Cache immediately
    await redis.set(cacheKey, value, { ex: DEFAULT_TTL_SECONDS });
  } catch (error) {
    console.error(`SYSTEM_SETTING_SET_ERROR [${key}]:`, error);
    throw error;
  }
}

/**
 * 🗑️ Invalidate Setting Cache
 */
export async function invalidateSystemSettingCache(key: string): Promise<void> {
  try {
    await redis.del(`${SETTINGS_CACHE_PREFIX}${key}`);
  } catch (error) {
    console.error(`CACHE_INVALIDATION_ERROR [${key}]:`, error);
  }
}

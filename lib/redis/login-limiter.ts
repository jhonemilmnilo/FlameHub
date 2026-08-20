import { redis } from "./client";

/**
 * 🏰 Login Brute-Force Rate Limiter & Progressive Lockout
 * - Tracks failed login attempts per email.
 * - 5 failed attempts -> 15-minute temporary lockout (900s).
 */

export interface LoginLockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
}

export async function checkLoginLockout(email: string): Promise<LoginLockoutStatus> {
  const normalizedEmail = email.toLowerCase().trim();
  const lockoutKey = `login:lockout:${normalizedEmail}`;

  try {
    const ttl = await redis.ttl(lockoutKey);
    if (ttl > 0) {
      return {
        isLocked: true,
        remainingSeconds: ttl,
      };
    }
    return { isLocked: false, remainingSeconds: 0 };
  } catch (error) {
    console.error("LOGIN_LOCKOUT_CHECK_ERROR:", error);
    return { isLocked: false, remainingSeconds: 0 };
  }
}

export async function recordFailedLoginAttempt(
  email: string
): Promise<{ isLocked: boolean; remainingSeconds: number; remainingAttempts: number }> {
  const normalizedEmail = email.toLowerCase().trim();
  const failsKey = `login:fails:${normalizedEmail}`;
  const lockoutKey = `login:lockout:${normalizedEmail}`;

  try {
    const fails = await redis.incr(failsKey);
    if (fails === 1) {
      await redis.expire(failsKey, 1800); // 30 minutes window
    }

    if (fails >= 5) {
      const lockoutDuration = 900; // 15 minutes lockout
      await redis.set(lockoutKey, "locked", { ex: lockoutDuration });
      return {
        isLocked: true,
        remainingSeconds: lockoutDuration,
        remainingAttempts: 0,
      };
    }

    return {
      isLocked: false,
      remainingSeconds: 0,
      remainingAttempts: Math.max(0, 5 - fails),
    };
  } catch (error) {
    console.error("RECORD_FAILED_LOGIN_ERROR:", error);
    return { isLocked: false, remainingSeconds: 0, remainingAttempts: 3 };
  }
}

export async function clearLoginLockout(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const failsKey = `login:fails:${normalizedEmail}`;
  const lockoutKey = `login:lockout:${normalizedEmail}`;

  try {
    await Promise.all([redis.del(failsKey), redis.del(lockoutKey)]);
  } catch (error) {
    console.error("CLEAR_LOGIN_LOCKOUT_ERROR:", error);
  }
}

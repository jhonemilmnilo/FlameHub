import { redis } from "./client";

/**
 * 📬 OTP Send Limiter & Active Lease Tracker
 *
 * 1. `otp:active:{email}` -> Active OTP countdown lease (TTL: 120s)
 *    If active (TTL > 0), user CANNOT request another OTP until it expires.
 *
 * 2. `otp:sent_count:{email}` -> Cumulative count of OTPs sent to this email (TTL: 24h)
 */

export const MAX_DAILY_OTP_SENDS = 6;

export interface OtpSendStatus {
  canSend: boolean;
  remainingSeconds: number;
  totalSentCount: number;
  isDailyLimitReached: boolean;
}

/**
 * Check if the email currently has an active OTP running (TTL > 0) or reached daily cap
 */
export async function checkActiveOtpSendStatus(email: string): Promise<OtpSendStatus> {
  const normalizedEmail = email.toLowerCase().trim();
  const activeKey = `otp:active:${normalizedEmail}`;
  const countKey = `otp:sent_count:${normalizedEmail}`;

  try {
    const [ttl, sentCount] = await Promise.all([
      redis.ttl(activeKey),
      redis.get<number>(countKey),
    ]);

    const remainingSeconds = ttl > 0 ? ttl : 0;
    const totalSentCount = sentCount || 0;
    const isDailyLimitReached = totalSentCount >= MAX_DAILY_OTP_SENDS;

    return {
      canSend: remainingSeconds === 0 && !isDailyLimitReached,
      remainingSeconds,
      totalSentCount,
      isDailyLimitReached,
    };
  } catch (error) {
    console.error("CHECK_ACTIVE_OTP_STATUS_CRITICAL_ERROR:", error);
    // 🛡️ Fail-Closed: Never assume sending is allowed during security service degradation
    return { canSend: false, remainingSeconds: 60, totalSentCount: 0, isDailyLimitReached: false };
  }
}

/**
 * Register a newly sent OTP in Redis:
 * - Checks daily ceiling (max 6 OTPs per 24 hours per email)
 * - Starts the 120s active countdown lease (`otp:active:{email}`)
 * - Increments cumulative sent counter (`otp:sent_count:{email}`)
 */
export async function registerOtpSend(
  email: string,
  leaseSeconds: number = 120,
  forceRenew: boolean = false
): Promise<{
  success: boolean;
  isAlreadyActive: boolean;
  isDailyLimitReached: boolean;
  totalSentCount: number;
  remainingSeconds: number;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const activeKey = `otp:active:${normalizedEmail}`;
  const countKey = `otp:sent_count:${normalizedEmail}`;

  try {
    // 1. Check daily send quota
    const currentCount = (await redis.get<number>(countKey)) || 0;
    if (currentCount >= MAX_DAILY_OTP_SENDS) {
      return {
        success: false,
        isAlreadyActive: false,
        isDailyLimitReached: true,
        totalSentCount: currentCount,
        remainingSeconds: 0,
      };
    }

    // 2. Check if an active OTP interval lease is already running
    const existingTtl = await redis.ttl(activeKey);
    
    // ⚡ If not forcing renew AND TTL is > 5s, reuse active session
    if (!forceRenew && existingTtl > 5) {
      return {
        success: true,
        isAlreadyActive: true,
        isDailyLimitReached: false,
        totalSentCount: currentCount,
        remainingSeconds: existingTtl,
      };
    }

    // 3. Set/Renew the 120s active lease
    await redis.set(activeKey, "active", { ex: leaseSeconds });

    // 4. Increment total OTPs sent count (keeps for 24 hours)
    const newCount = await redis.incr(countKey);
    if (newCount === 1) {
      await redis.expire(countKey, 86400); // 24 hours
    }

    return {
      success: true,
      isAlreadyActive: false,
      isDailyLimitReached: false,
      totalSentCount: newCount,
      remainingSeconds: leaseSeconds,
    };
  } catch (error) {
    console.error("REGISTER_OTP_SEND_CRITICAL_ERROR:", error);
    // 🛡️ Fail-Closed: Reject automated send if Redis cluster is unreachable
    return {
      success: false,
      isAlreadyActive: false,
      isDailyLimitReached: false,
      totalSentCount: 0,
      remainingSeconds: 60,
    };
  }
}

/**
 * Clear the active OTP lease upon successful email verification
 */
export async function clearActiveOtpSend(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const activeKey = `otp:active:${normalizedEmail}`;

  try {
    await redis.del(activeKey);
  } catch (error) {
    console.error("CLEAR_ACTIVE_OTP_SEND_ERROR:", error);
  }
}

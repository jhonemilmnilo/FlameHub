import { redis } from "./client";

/**
 * 📬 OTP Send Limiter & Active Lease Tracker
 *
 * 1. `otp:active:{email}` -> Active OTP countdown lease (TTL: 120s)
 *    If active (TTL > 0), user CANNOT request another OTP until it expires.
 *
 * 2. `otp:sent_count:{email}` -> Cumulative count of OTPs sent to this email (TTL: 24h)
 */

export interface OtpSendStatus {
  canSend: boolean;
  remainingSeconds: number;
  totalSentCount: number;
}

/**
 * Check if the email currently has an active OTP running (TTL > 0)
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

    return {
      canSend: remainingSeconds === 0,
      remainingSeconds,
      totalSentCount,
    };
  } catch (error) {
    console.error("CHECK_ACTIVE_OTP_STATUS_CRITICAL_ERROR:", error);
    // 🛡️ Fail-Closed: Never assume sending is allowed during security service degradation
    return { canSend: false, remainingSeconds: 60, totalSentCount: 0 };
  }
}

/**
 * Register a newly sent OTP in Redis:
 * - Starts the 120s active countdown lease (`otp:active:{email}`)
 * - Increments cumulative sent counter (`otp:sent_count:{email}`)
 */
export async function registerOtpSend(
  email: string,
  leaseSeconds: number = 120
): Promise<{ success: boolean; isAlreadyActive: boolean; totalSentCount: number; remainingSeconds: number }> {
  const normalizedEmail = email.toLowerCase().trim();
  const activeKey = `otp:active:${normalizedEmail}`;
  const countKey = `otp:sent_count:${normalizedEmail}`;

  try {
    // 1. Check if an active OTP is already running
    const existingTtl = await redis.ttl(activeKey);
    
    // ⚡ 5-second threshold: If TTL is > 5s, DO NOT send another OTP, reuse active session
    if (existingTtl > 5) {
      const currentCount = (await redis.get<number>(countKey)) || 1;
      return {
        success: true, // Allow redirecting user to /auth/verify with existing active timer
        isAlreadyActive: true,
        totalSentCount: currentCount,
        remainingSeconds: existingTtl,
      };
    }

    // 2. Set/Renew the 120s active lease (if <= 5s or no active OTP)
    await redis.set(activeKey, "active", { ex: leaseSeconds });

    // 3. Increment total OTPs sent count (keeps for 24 hours)
    const newCount = await redis.incr(countKey);
    if (newCount === 1) {
      await redis.expire(countKey, 86400); // 24 hours
    }

    return {
      success: true,
      isAlreadyActive: false,
      totalSentCount: newCount,
      remainingSeconds: leaseSeconds,
    };
  } catch (error) {
    console.error("REGISTER_OTP_SEND_CRITICAL_ERROR:", error);
    // 🛡️ Fail-Closed: Reject automated send if Redis cluster is unreachable
    return { success: false, isAlreadyActive: false, totalSentCount: 0, remainingSeconds: 60 };
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

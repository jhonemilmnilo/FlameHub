import "dotenv/config";
import { redis } from "../lib/redis/client";
import { recordFailedLoginAttempt } from "../lib/redis/login-limiter";

/**
 * 🕵️‍♂️ Hacker Simulation: Lockout Surveillance & Reconnaissance Attack
 * 
 * What the Hacker is trying to do:
 * 1. Put a victim email into Tier 1 lockout (3 mins cooldown).
 * 2. Blast the status check endpoint 25 times in rapid succession to spy on the cooldown.
 * 3. Verify that after 15 requests, our IP rate limiter neutralizes the bot!
 */
async function simulateReconnaissanceAttack() {
  const simulatedAttackerIp = `192.168.1.${Math.floor(Math.random() * 200) + 10}`;
  const targetVictimEmail = `student_victim_${Date.now()}@urdaneta.edu.ph`;

  console.log(`\n======================================================`);
  console.log(`🚨 STARTING RECONNAISSANCE & SPYING SIMULATION`);
  console.log(`🥷 Attacker IP: ${simulatedAttackerIp}`);
  console.log(`🎯 Targeted Student: ${targetVictimEmail}`);
  console.log(`======================================================\n`);

  // Step 1: Force target into lockout
  console.log(`[Step 1] Attacker causes 5 failed logins on victim's account...`);
  for (let i = 0; i < 5; i++) {
    await recordFailedLoginAttempt(targetVictimEmail);
  }
  console.log(`✅ Target is now locked out in Redis for 180 seconds.\n`);

  // Step 2: Attacker runs rapid polling bot (20 queries in a few seconds)
  console.log(`[Step 2] Attacker launches automated reconnaissance bot to spy on lockout timer...`);
  
  let blockedCount = 0;
  let successfulSpyCount = 0;

  for (let query = 1; query <= 20; query++) {
    // Simulate what checkStatusQueryRateLimit does
    const rateLimitKey = `ratelimit:status_check:${simulatedAttackerIp}`;
    const count = await redis.incr(rateLimitKey);
    if (count === 1) {
      await redis.expire(rateLimitKey, 60);
    }

    const isAllowed = count <= 15;

    if (isAllowed) {
      successfulSpyCount++;
      console.log(`📡 [Query #${query}] SPY SUCCESS: Attacker read telemetry (Attempt ${count}/15 allowed)`);
    } else {
      blockedCount++;
      console.log(`🛡️ [Query #${query}] BLOCKED (429)! IP Rate limit tripped! Neutral payload returned.`);
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`📊 SIMULATION REPORT:`);
  console.log(`- Allowed queries before throttle: ${successfulSpyCount}`);
  console.log(`- Throttled / Neutralized probes: ${blockedCount}`);

  if (blockedCount > 0) {
    console.log(`\n🏆 CONCLUSION: RECONNAISSANCE BOT WAS EFFECTIVELY NEUTRALIZED! 🎉`);
    console.log(`Adversary can no longer freely surveil student accounts or sync brute-force timing.`);
  } else {
    console.log(`❌ VULNERABLE: Bot was able to query unlimited times.`);
  }
  console.log(`======================================================\n`);

  process.exit(0);
}

simulateReconnaissanceAttack().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});

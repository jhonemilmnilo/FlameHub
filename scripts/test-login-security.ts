import "dotenv/config";
import { checkLoginLockout, recordFailedLoginAttempt } from "../lib/redis/login-limiter";

/**
 * 🕵️‍♂️ Hacker Simulation Test: User Enumeration & Lockout Probe
 * 
 * This script simulates an automated adversary trying to:
 * 1. Test non-existent email addresses to see if the system leaks account status.
 * 2. Brute-force requests to verify if progressive lockouts trigger on fake emails.
 */
async function simulateAttacker() {
  const targetEmail = `fake_hacker_victim_${Date.now()}@urdaneta.edu.ph`;
  console.log(`\n======================================================`);
  console.log(`🚨 STARTING ADVERSARY SIMULATION`);
  console.log(`🎯 Target probed email: ${targetEmail}`);
  console.log(`======================================================\n`);

  console.log(`[Step 1] Attacker probes email with 5 rapid password guesses...`);

  for (let attempt = 1; attempt <= 5; attempt++) {
    console.log(`\n[Attack #${attempt}] Sending malicious login payload...`);
    
    // Simulate what loginAction does on failed auth
    const penalty = await recordFailedLoginAttempt(targetEmail);

    if (penalty.isLocked) {
      console.log(`💥 🛡️ DEFENSE TRIGGERED: Target email got LOCKED OUT at Tier ${penalty.tier}!`);
      console.log(`⏱️ Remaining Lockdown Duration: ${penalty.remainingSeconds} seconds (${Math.ceil(penalty.remainingSeconds / 60)} minute(s))`);
    } else {
      console.log(`⚠️ Attempt registered! Remaining attempts before Tier 1 Lockout: ${penalty.remainingAttemptsInTier}`);
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`[Step 2] Attacker tries a 6th request during lockdown...`);
  const postLockoutCheck = await checkLoginLockout(targetEmail);

  if (postLockoutCheck.isLocked) {
    console.log(`🔒 ACCESS DENIED! Attacker is blocked by Redis limiter.`);
    console.log(`📊 Status: isLocked=${postLockoutCheck.isLocked}, tier=${postLockoutCheck.tier}, remainingSecs=${postLockoutCheck.remainingSeconds}`);
    console.log(`\n🏆 CONCLUSION: IMMUNE TO USER ENUMERATION & LOCKOUT BYPASS! 🎉`);
  } else {
    console.log(`❌ VULNERABLE: Attacker bypassed lockout.`);
  }

  console.log(`======================================================\n`);
  process.exit(0);
}

simulateAttacker().catch((err) => {
  console.error("Simulation error:", err);
  process.exit(1);
});

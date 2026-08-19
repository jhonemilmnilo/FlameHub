import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * 🔒 Cryptographically Secure Constant-Time Authorization Verifier
 * Defends against microsecond side-channel timing attacks
 */
function isAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!header || !secret) return false;
  const expected = `Bearer ${secret}`;
  const headerBuffer = Buffer.from(header);
  const expectedBuffer = Buffer.from(expected);

  if (headerBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(headerBuffer, expectedBuffer);
}

/**
 * 🧹 Automated Ghost User Cleanup Route (Solution 1)
 *
 * Scans Supabase Auth & PostgreSQL DB for abandoned unverified accounts older than 24 hours.
 * Must be triggered via secure HTTP POST with constant-time Bearer token authorization.
 */
export async function POST(request: Request) {
  const timestamp = new Date().toISOString();

  try {
    // 1. Strict Cryptographic Constant-Time Authorization Gate
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!isAuthorized(authHeader, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // 2. Fetch registered users in Supabase Auth
    const { data: userList, error: listError } = await adminSupabase.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError || !userList?.users) {
      return NextResponse.json({ error: listError?.message || "Failed to fetch users" }, { status: 500 });
    }

    // 3. Filter for unconfirmed abandoned users created > 24 hours ago
    const ghostUsers = userList.users.filter((user) => {
      const isUnconfirmed = !user.email_confirmed_at;
      const isOlderThan24h = new Date(user.created_at) < cutoffTime;
      return isUnconfirmed && isOlderThan24h;
    });

    let deletedCount = 0;
    const deletedUserIds: string[] = [];

    // 4. Clean up ghost accounts from Supabase Auth & PostgreSQL
    for (const ghost of ghostUsers) {
      try {
        // Delete from Supabase Auth
        await adminSupabase.auth.admin.deleteUser(ghost.id);

        // Delete from Prisma DB if any residual record exists
        await prisma.user.deleteMany({
          where: { id: ghost.id },
        });

        deletedCount++;
        deletedUserIds.push(ghost.id);
      } catch (delError) {
        console.error(`Failed to delete ghost user [${ghost.id}]:`, delError);
      }
    }

    console.info(
      JSON.stringify({
        timestamp,
        level: "info",
        event: "CRON_GHOST_USERS_CLEANUP_SUCCESS",
        deletedCount,
        scannedCount: userList.users.length,
      })
    );

    return NextResponse.json({
      success: true,
      scanned: userList.users.length,
      cleanedUpCount: deletedCount,
      timestamp,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("CRON_CLEANUP_EXCEPTION:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

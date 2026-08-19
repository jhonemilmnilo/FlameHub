import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * 🔒 Supabase Admin Client (Service Role)
 * Used ONLY in secure server environments (Cron jobs, Admin cleanup, System routines).
 * NEVER expose to the browser!
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

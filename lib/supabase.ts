// lib/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only validate during runtime, not during build
// During build, Next.js may analyze routes but env vars might not be available yet
// We'll validate when clients are actually used (at runtime in API routes)
const isBuildTime =
  typeof process !== "undefined" &&
  (process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-development-build" ||
    // During Vercel build, env vars might not be available even if configured
    // Check if we're in a build context by looking for build-related env vars
    (process.env.VERCEL === "1" && !supabaseUrl));

// Only throw error if we're not in build time AND variables are missing
// During build, we'll use placeholder values
if (!isBuildTime && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error("Missing required Supabase environment variables");
}

// Create clients - use placeholder values during build if needed
// These will only be used at runtime, so placeholders are safe
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      persistSession: !isBuildTime,
      autoRefreshToken: !isBuildTime,
      detectSessionInUrl: !isBuildTime,
    },
  }
);

// Admin client - only create if service key is available
export const supabaseAdmin =
  supabaseServiceKey && supabaseUrl
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: "public",
        },
        global: {
          headers: {
            apikey: supabaseServiceKey,
          },
        },
      })
    : null;

// Only log warning in development and on server-side (not client-side)
// Service role key should never be available on client, so this is expected
if (
  process.env.NODE_ENV === "development" &&
  !supabaseAdmin &&
  typeof window === "undefined"
) {
  console.warn(
    "⚠️ Supabase Admin client not available - missing service role key"
  );
}

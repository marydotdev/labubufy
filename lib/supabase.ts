// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing required Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = supabaseServiceKey
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

// Log for debugging (remove in production)
if (supabaseAdmin) {
  console.log("✅ Supabase Admin client initialized with service role");
} else {
  console.warn(
    "⚠️ Supabase Admin client not available - missing service role key"
  );
}

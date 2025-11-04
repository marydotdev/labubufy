// app/api/debug/env/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const diagnostics = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceKeyFirstChars:
      process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) || "NOT_FOUND",
    allEnvKeys: Object.keys(process.env).filter(
      (key) =>
        key.includes("SUPABASE") ||
        key.includes("STRIPE") ||
        key.includes("REPLICATE")
    ),
  };

  return NextResponse.json(diagnostics);
}

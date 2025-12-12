// app/api/debug/env/route.ts
// Debug route - only available in development mode
import { NextResponse } from "next/server";

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const diagnostics = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    // Only show first 3 chars in dev for safety
    serviceKeyFirstChars:
      process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 3) || "NOT_FOUND",
    allEnvKeys: Object.keys(process.env).filter(
      (key) =>
        key.includes("SUPABASE") ||
        key.includes("STRIPE") ||
        key.includes("REPLICATE")
    ),
  };

  return NextResponse.json(diagnostics);
}

// app/auth/callback/route.ts
// OAuth callback handler for social login (Google/Apple)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback error:", error);
      return NextResponse.redirect(`${requestUrl.origin}/?error=oauth_failed`);
    }

    if (data.session?.user) {
      // Ensure user record exists
      const supabaseAdmin = createClient(
        supabaseUrl,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      try {
        // Get client IP for tracking
        const clientIP =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          null;

        await supabaseAdmin.rpc("ensure_user_exists", {
          auth_id: data.session.user.id,
          email: data.session.user.email,
          is_anonymous: false,
          ip_address: clientIP || null,
          browser_fingerprint: null, // OAuth callback doesn't have fingerprint
        });
      } catch (err) {
        console.error("Failed to ensure user record:", err);
        // Continue anyway - user is authenticated
      }
    }

    // Redirect to home page with success
    return NextResponse.redirect(`${requestUrl.origin}/?oauth=success`);
  }

  // No code parameter - redirect to home
  return NextResponse.redirect(`${requestUrl.origin}/`);
}

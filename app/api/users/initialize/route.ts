// app/api/users/initialize/route.ts
// Updated to use new ensure_user_exists database function with IP/fingerprint tracking
import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { getClientIP } from "@/lib/utils/ip-fingerprint";

export async function POST(request: NextRequest) {
  try {
    // Get the user's session token from the request
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "No authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the user's session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("🔐 Initializing user for:", user.id);

    // Check if admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get client IP and browser fingerprint for abuse prevention
    const clientIP = getClientIP(request);
    const body = await request.json().catch(() => ({}));
    const browserFingerprint = body.browserFingerprint || null;

    // Use the new ensure_user_exists function with IP and fingerprint
    const rpcParams = {
      auth_id: user.id,
      email: user.email || null,
      is_anonymous: user.is_anonymous ?? true,
      ip_address: clientIP || null,
      browser_fingerprint: browserFingerprint || null,
    };

    const { data, error } = await supabaseAdmin.rpc(
      "ensure_user_exists",
      rpcParams
    );

    if (error) {
      console.error("❌ Failed to ensure user exists:", error);

      return NextResponse.json(
        { error: `Failed to initialize user: ${error.message}` },
        { status: 500 }
      );
    }

    // The function returns a JSON object with user data
    interface EnsureUserExistsResponse {
      id: string;
      auth_user_id: string;
      email: string | null;
      is_anonymous: boolean;
      credits: number;
      total_purchased?: number;
      total_spent?: number;
    }

    const userData = data as EnsureUserExistsResponse;

    console.log("✅ User initialized successfully:", userData);

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        auth_id: userData.auth_user_id, // Function returns auth_user_id
        email: userData.email,
        is_anonymous: userData.is_anonymous,
        credits: userData.credits || 0,
        total_purchased: userData.total_purchased || 0,
        total_spent: userData.total_spent || 0,
      },
    });
  } catch (error) {
    console.error("❌ Error initializing user:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 }
    );
  }
}

// app/api/users/restore-anonymous/route.ts
// Restore anonymous user credits based on stored auth_id or browser fingerprint
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Get the current user's session token
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "No authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the user's session
    const { supabase } = await import("@/lib/supabase");
    const supabaseClient = supabase;
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !currentUser || !currentUser.is_anonymous) {
      return NextResponse.json(
        { error: "Invalid token or not anonymous user" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const storedAnonymousAuthId = body.storedAnonymousAuthId || null;
    const browserFingerprint = body.browserFingerprint || null;

    // Try to find the previous anonymous user
    let previousUser = null;
    let previousCredits = null;

    if (storedAnonymousAuthId) {
      // Look up by stored auth_id - use RPC to handle both column names
      // First try using raw SQL query that works with both schemas
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
        "ensure_user_exists",
        {
          auth_id: storedAnonymousAuthId,
          email: null,
          is_anonymous: true,
          ip_address: null,
          browser_fingerprint: null,
        }
      );

      if (!rpcError && rpcData) {
        // RPC returns user data directly
        interface UserRpcData {
          id: string;
          credits?: number;
        }
        const userData = rpcData as UserRpcData;
        const userId = userData.id;

        // Get credits for this user
        const { data: creditsData, error: creditsError } = await supabaseAdmin
          .from("user_credits")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (!creditsError && creditsData) {
          previousUser = { id: userId };
          previousCredits = creditsData.balance;
        } else if (userData.credits !== undefined) {
          // If credits are in the users table (newer schema)
          previousUser = { id: userId };
          previousCredits = userData.credits;
        }
      } else {
        // Fallback: try direct query with both column names
        const { data, error } = await supabaseAdmin
          .from("users")
          .select("id, auth_id, auth_user_id, is_anonymous, credits")
          .or(
            `auth_id.eq.${storedAnonymousAuthId},auth_user_id.eq.${storedAnonymousAuthId}`
          )
          .eq("is_anonymous", true)
          .maybeSingle();

        if (!error && data) {
          // Try to get credits from user_credits table
          const { data: creditsData, error: creditsError } = await supabaseAdmin
            .from("user_credits")
            .select("balance")
            .eq("user_id", data.id)
            .maybeSingle();

          if (!creditsError && creditsData) {
            previousUser = data;
            previousCredits = creditsData.balance;
          } else if (data.credits !== undefined) {
            // Credits might be in users table
            previousUser = data;
            previousCredits = data.credits;
          }
        }
      }
    }

    // If not found by auth_id, try browser fingerprint
    if (!previousUser && browserFingerprint) {
      // Find the most recent anonymous user with this fingerprint
      // We'll need to check the ensure_user_exists calls or track this differently
      // For now, we'll use the stored auth_id approach
    }

    // If we found previous credits, update the current user's credits
    if (previousCredits !== null && previousUser) {
      // Find current user record using RPC (handles both column names)
      const { data: currentUserRpcData, error: currentUserRpcError } =
        await supabaseAdmin.rpc("ensure_user_exists", {
          auth_id: currentUser.id,
          email: null,
          is_anonymous: true,
          ip_address: null,
          browser_fingerprint: null,
        });

      let currentUserRecord: { id: string } | null = null;
      let userError = currentUserRpcError;

      if (!currentUserRpcError && currentUserRpcData) {
        interface UserRpcData {
          id: string;
        }
        const userData = currentUserRpcData as UserRpcData;
        currentUserRecord = { id: userData.id };
      } else {
        // Fallback: try direct query
        const { data: data2, error: error2 } = await supabaseAdmin
          .from("users")
          .select("id, auth_id, auth_user_id")
          .or(`auth_id.eq.${currentUser.id},auth_user_id.eq.${currentUser.id}`)
          .maybeSingle();
        if (!error2 && data2) {
          currentUserRecord = data2;
          userError = null;
        }
      }

      if (!userError && currentUserRecord) {
        // Try to update credits in users table first (newer schema)
        const { error: updateUsersError } = await supabaseAdmin
          .from("users")
          .update({ credits: previousCredits })
          .eq("id", currentUserRecord.id);

        if (!updateUsersError) {
          // Successfully updated in users table
          return NextResponse.json({
            success: true,
            restored: true,
            credits: previousCredits,
          });
        }

        // Fallback: try user_credits table (older schema)
        const { error: updateCreditsError } = await supabaseAdmin
          .from("user_credits")
          .update({ balance: previousCredits })
          .eq("user_id", currentUserRecord.id);

        if (!updateCreditsError) {
          return NextResponse.json({
            success: true,
            restored: true,
            credits: previousCredits,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      restored: false,
      message: "No previous anonymous user found",
    });
  } catch (error) {
    console.error("❌ Error restoring anonymous user:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 }
    );
  }
}

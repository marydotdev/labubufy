// app/api/credits/refund/route.ts
// Updated for new schema: credits in users table
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { predictionId } = await request.json();

    if (!predictionId) {
      return NextResponse.json(
        { error: "Missing predictionId" },
        { status: 400 }
      );
    }

    // Get user from users table using auth_user_id
    const { data: userRecord, error: userError } = await supabaseAdmin!
      .from("users")
      .select("id, credits, total_spent")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if this prediction was already refunded (if credit_events table exists)
    try {
      const { data: existingRefund } = await supabaseAdmin!
        .from("credit_events")
        .select("*")
        .eq("user_id", user.id) // auth_user_id
        .eq("type", "refund")
        .contains("metadata", { prediction_id: predictionId })
        .single();

      if (existingRefund) {
        return NextResponse.json({ error: "Already refunded" }, { status: 400 });
      }
    } catch (err) {
      // Table might not exist, continue anyway
      console.log("Could not check for existing refund (table may not exist):", err);
    }

    // Refund 1 credit - update users table directly
    const { data: updatedUser, error: updateError } = await supabaseAdmin!
      .from("users")
      .update({
        credits: (userRecord.credits || 0) + 1,
        total_spent: Math.max(0, (userRecord.total_spent || 0) - 1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userRecord.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to refund credits" },
        { status: 500 }
      );
    }

    // Record refund event (if credit_events table exists)
    try {
      await supabaseAdmin!.from("credit_events").insert({
        user_id: user.id, // auth_user_id
        type: "refund",
        amount: 1,
        description: "Generation failed - credit refunded",
        metadata: { prediction_id: predictionId },
      });
    } catch (err) {
      // Table might not exist, that's okay
      console.log("Could not record credit event (table may not exist):", err);
    }

    return NextResponse.json({
      success: true,
      credits: updatedUser.credits,
    });
  } catch (error) {
    console.error("Refund credits error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

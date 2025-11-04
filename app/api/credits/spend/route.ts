// app/api/credits/spend/route.ts
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

    // Verify user with their token
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

    // Check if user has enough credits
    if (userRecord.credits < 1) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 403 }
      );
    }

    // Deduct 1 credit - update users table directly
    const { data: updatedUser, error: updateError } = await supabaseAdmin!
      .from("users")
      .update({
        credits: userRecord.credits - 1,
        total_spent: (userRecord.total_spent || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userRecord.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 500 }
      );
    }

    // Record credit event (if credit_events table exists)
    try {
      await supabaseAdmin!.from("credit_events").insert({
        user_id: user.id, // auth_user_id
        type: "spend",
        amount: -1,
        description: "Image generation",
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
    console.error("Spend credits error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

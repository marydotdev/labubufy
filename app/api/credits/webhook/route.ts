// app/api/credits/webhook/route.ts
// Note: Webhook route kept for backward compatibility
// The new payment flow uses session verification instead of webhooks
// Updated to use new schema: users table and add_credits function
import { NextRequest, NextResponse } from "next/server";
import Stripe from 'stripe';

import { supabaseAdmin } from "@/lib/supabase";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status === "paid") {
          const { userId, packageId, credits } = session.metadata as {
            userId: string;
            packageId: string;
            credits: string;
          };

          try {
            // userId from metadata is users.id (primary key)
            // But add_credits function expects auth_user_id
            // So we need to get the auth_user_id from the users table
            const { data: user, error: userError } = await supabaseAdmin!
              .from("users")
              .select("auth_user_id")
              .eq("id", userId)
              .single();

            if (userError || !user) {
              console.error("Error fetching user:", userError);
              return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
              );
            }

            const creditsToAdd = parseInt(credits);
            console.log(`💰 Adding ${creditsToAdd} credits to user ${userId}...`);

            // Use the add_credits function with auth_user_id
            const { data: updatedUser, error: updateError } = await supabaseAdmin!.rpc('add_credits', {
              auth_id: user.auth_user_id,
              amount: creditsToAdd,
              transaction_type: 'purchase',
              description: `Purchased ${creditsToAdd} credits`,
              metadata: {
                package_id: packageId,
                stripe_session_id: session.id,
                amount_paid: session.amount_total,
                currency: session.currency,
              }
            });

            if (updateError) {
              console.error("❌ Error adding credits:", updateError);
              return NextResponse.json(
                { error: "Failed to add credits" },
                { status: 500 }
              );
            }

            console.log("✅ Credits added successfully:", updatedUser);
            console.log(`💰 New balance: ${updatedUser.credits} credits`);
          } catch (error) {
            console.error("❌ Error processing payment:", error);
            return NextResponse.json(
              { error: "Failed to process payment" },
              { status: 500 }
            );
          }
        }
        break;

      case "checkout.session.expired":
        console.log("⏰ Checkout session expired:", event.data.object.id);
        break;

      case "payment_intent.payment_failed":
        console.log("❌ Payment failed:", event.data.object.id);
        break;

      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("💥 Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

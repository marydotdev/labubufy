// app/api/credits/webhook/route.ts - Fixed version
// Note: Webhook route kept for backward compatibility
// The new payment flow uses session verification instead of webhooks
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
            // Get current user credits - userId is user_credits.id
            const { data: currentCredits, error: fetchError } =
              await supabaseAdmin!
                .from("user_credits")
                .select("*")
                .eq("id", userId)
                .single();

            if (fetchError || !currentCredits) {
              console.error("Error fetching user credits:", fetchError);
              return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
              );
            }

            console.log("📊 Current user credits:", currentCredits);

            // Add credits to user account
            const creditsToAdd = parseInt(credits);
            const newCreditsTotal = currentCredits.credits + creditsToAdd;
            const newPurchasedTotal =
              currentCredits.total_purchased + creditsToAdd;

            console.log(`💰 Adding ${creditsToAdd} credits...`);
            console.log(
              `📈 New totals: credits=${newCreditsTotal}, purchased=${newPurchasedTotal}`
            );

            // Update with explicit values
            const { error: updateError } = await supabaseAdmin!
              .from("user_credits")
              .update({
                credits: newCreditsTotal,
                total_purchased: newPurchasedTotal,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);

            if (updateError) {
              console.error("❌ Error updating user credits:", updateError);
              return NextResponse.json(
                { error: "Failed to add credits" },
                { status: 500 }
              );
            }

            // Verify the update worked by fetching again
            const { data: verifyCredits, error: verifyError } =
              await supabaseAdmin!
                .from("user_credits")
                .select("credits, total_purchased")
                .eq("id", userId)
                .single();

            if (verifyError) {
              console.error("⚠️ Could not verify update:", verifyError);
            } else {
              console.log("✅ Verified new credits:", verifyCredits);
            }

            // Add purchase transaction - use auth_user_id for transactions
            const { error: transactionError } = await supabaseAdmin!
              .from("credit_transactions")
              .insert({
                user_id: currentCredits.auth_user_id,
                type: "purchase",
                amount: creditsToAdd,
                description: `Purchased ${creditsToAdd} credits`,
                metadata: {
                  package_id: packageId,
                  stripe_session_id: session.id,
                  amount_paid: session.amount_total,
                  currency: session.currency,
                },
              });

            if (transactionError) {
              console.error("⚠️ Error creating transaction:", transactionError);
              // Don't fail the webhook for transaction errors
            } else {
              console.log("📝 Transaction recorded");
            }

            console.log(
              `✅ Credits added: ${creditsToAdd} credits for user ${userId}`
            );
            console.log(`💰 New balance: ${newCreditsTotal} credits`);
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

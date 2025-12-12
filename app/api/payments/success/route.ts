// app/api/payments/success/route.ts
// Payment success handler - verifies payment and adds credits/subscription
// Updated for new schema: credits in users table, add_credits function takes auth_id
import { NextRequest, NextResponse } from 'next/server';
import { stripeService, PRICING } from '@/lib/payments/stripe-service';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    console.error('Payment success: Missing session_id');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/?error=missing_session`);
  }

  try {
    console.log('Payment success: Verifying session', sessionId);

    // Verify payment with Stripe
    let result;
    try {
      result = await stripeService.verifySession(sessionId);
      console.log('Payment success: Session verified', result);
    } catch (stripeError) {
      console.error('Payment success: Stripe verification failed', stripeError);
      throw new Error(`Stripe verification failed: ${stripeError instanceof Error ? stripeError.message : 'Unknown error'}`);
    }

    // Update user credits based on payment type
    if (result.type === 'credits') {
      const product = PRICING.credits.find(p => p.id === result.productId);
      if (!product) {
        console.error('Payment success: Invalid product', result.productId);
        throw new Error('Invalid product');
      }

      console.log('Payment success: Adding credits', { userId: result.userId, amount: product.amount });

      // The userId from Stripe metadata is the users.id (primary key)
      // But add_credits function expects auth_user_id (not users.id)
      // So we need to get the auth_user_id from the users table
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('auth_user_id')
        .eq('id', result.userId)
        .single();

      if (userError || !user) {
        console.error('Payment success: User not found', { userId: result.userId, error: userError });
        throw new Error(`User not found: ${result.userId}`);
      }

      // Use the add_credits function with auth_user_id
      const { data: updatedUser, error: updateError } = await supabaseAdmin.rpc('add_credits', {
        auth_id: user.auth_user_id,
        amount: product.amount,
        transaction_type: 'purchase',
        description: `Purchased ${product.amount} credits`,
        metadata: {
          stripe_session_id: sessionId,
          product_id: result.productId
        }
      });

      if (updateError) {
        console.error('Payment success: Failed to add credits', updateError);
        throw new Error(`Failed to add credits: ${updateError.message}`);
      }

      console.log('Payment success: Credits added successfully', updatedUser);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/?success=credits_added&amount=${product.amount}`);

    } else if (result.type === 'subscription') {
      // Note: Subscription support would need to be added to users table
      // For now, we'll just add subscription credits
      const subscription = Object.values(PRICING.subscriptions)
        .find(s => s.id === result.productId);

      if (!subscription) throw new Error('Invalid subscription');

      // Get user's auth_user_id
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('auth_user_id')
        .eq('id', result.userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Add subscription credits using add_credits function
      const { error: updateError } = await supabaseAdmin.rpc('add_credits', {
        auth_id: user.auth_user_id,
        amount: subscription.credits,
        transaction_type: 'purchase',
        description: `Subscription: ${result.productId}`,
        metadata: {
          stripe_session_id: sessionId,
          subscription_id: result.subscriptionId,
          subscription_tier: result.productId
        }
      });

      if (updateError) {
        console.error('Payment success: Failed to add subscription credits', updateError);
        throw new Error(`Failed to add subscription credits: ${updateError.message}`);
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/?success=subscription_active&tier=${result.productId}`);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/?error=invalid_payment_type`);

  } catch (error) {
    console.error('Payment verification failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Full error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    // Redirect with error details for debugging (remove in production)
    return NextResponse.redirect(`${baseUrl}/?error=payment_failed&details=${encodeURIComponent(errorMessage)}`);
  }
}

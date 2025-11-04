// lib/payments/stripe-service.ts
// Refactored Stripe service with subscription support
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    })
  : null;

export interface PaymentResult {
  userId: string;
  productId: string;
  type: 'credits' | 'subscription';
  stripeCustomerId?: string;
  subscriptionId?: string;
}

export const PRICING = {
  credits: [
    { id: 'credit_10', amount: 10, price: 499, popular: false },
    { id: 'credit_30', amount: 30, price: 1299, popular: true },
    { id: 'credit_100', amount: 100, price: 3499, popular: false },
  ],
  subscriptions: {
    starter: {
      id: 'sub_starter',
      price_id: process.env.STRIPE_STARTER_PRICE_ID || '',
      credits: 50,
      price: 999
    },
    pro: {
      id: 'sub_pro',
      price_id: process.env.STRIPE_PRO_PRICE_ID || '',
      credits: 150,
      price: 1999
    }
  }
};

export class StripeService {
  async createCheckoutSession(
    userId: string,
    productId: string,
    type: 'credits' | 'subscription'
  ): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.');
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    let mode: 'payment' | 'subscription';

    if (type === 'credits') {
      const product = PRICING.credits.find(p => p.id === productId);
      if (!product) throw new Error('Invalid product');

      mode = 'payment';
      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${product.amount} Credits`,
            description: 'Labubufy AI Generation Credits',
          },
          unit_amount: product.price,
        },
        quantity: 1,
      }];
    } else {
      const product = Object.values(PRICING.subscriptions).find(p => p.id === productId);
      if (!product) throw new Error('Invalid subscription');
      if (!product.price_id) {
        throw new Error(`Subscription price ID not configured for ${productId}`);
      }

      mode = 'subscription';
      lineItems = [{
        price: product.price_id,
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: lineItems,
      success_url: `${baseUrl}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment=canceled`,
      metadata: {
        user_id: userId,
        product_id: productId,
        type,
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    return session.url;
  }

  async verifySession(sessionId: string): Promise<PaymentResult> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'subscription']
    });

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      throw new Error('Payment not completed');
    }

    if (!session.metadata?.user_id || !session.metadata?.product_id || !session.metadata?.type) {
      throw new Error('Missing required session metadata');
    }

    return {
      userId: session.metadata.user_id,
      productId: session.metadata.product_id,
      type: session.metadata.type as 'credits' | 'subscription',
      stripeCustomerId: session.customer as string | undefined,
      subscriptionId: typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id,
    };
  }
}

export const stripeService = new StripeService();


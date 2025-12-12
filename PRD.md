Labubufy Refactoring Implementation Guide
Executive Summary
This document outlines a comprehensive refactoring plan for the Labubufy application, focusing on simplifying authentication, payments, and storage while improving reliability and user experience. 

1. Authentication System Refactor
Current Issues

Authentication logic scattered across 3+ files
Unreliable anonymous user creation
Complex email linking with duplicate checking
No social login support

New Architecture
1.1 Consolidated Auth Service
Create a single source of truth at lib/auth/index.ts:
typescript// lib/auth/index.ts
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const AuthSchema = {
  email: z.string().email(),
  password: z.string().min(6),
};

export class AuthService {
  private static instance: AuthService;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize(): Promise<User> {
    // 1. Check for existing session
    const { data: { session } } = await this.supabase.auth.getSession();

    if (session?.user) {
      return this.ensureUserRecord(session.user);
    }

    // 2. Create anonymous user with retry logic
    return this.createAnonymousUserWithRetry();
  }

  private async createAnonymousUserWithRetry(attempts = 3): Promise<User> {
    for (let i = 0; i < attempts; i++) {
      try {
        const { data, error } = await this.supabase.auth.signInAnonymously();
        if (data?.user) {
          return this.ensureUserRecord(data.user);
        }
      } catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
    throw new Error('Failed to create anonymous user');
  }

  private async ensureUserRecord(authUser: AuthUser): Promise<User> {
    // Ensure user exists in our database with credits
    const { data, error } = await this.supabase.rpc('ensure_user_exists', {
      auth_id: authUser.id,
      email: authUser.email,
      is_anonymous: authUser.is_anonymous ?? true
    });

    if (error) throw error;
    return data;
  }

  async upgradeToEmail(email: string, password: string): Promise<User> {
    const validated = AuthSchema.parse({ email, password });

    const { data, error } = await this.supabase.auth.updateUser({
      email: validated.email,
      password: validated.password
    });

    if (error) throw error;

    // Update user record
    await this.supabase
      .from('users')
      .update({
        email: validated.email,
        is_anonymous: false,
        upgraded_at: new Date().toISOString()
      })
      .eq('auth_id', data.user.id);

    return this.ensureUserRecord(data.user);
  }

  async signInWithProvider(provider: 'google' | 'apple'): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}

export const authService = AuthService.getInstance();
1.2 Database Schema Updates
sql-- migrations/001_simplified_auth.sql

-- Simplified users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  upgraded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User credits with better tracking
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 3 CHECK (balance >= 0),
  lifetime_purchased INTEGER DEFAULT 0,
  lifetime_spent INTEGER DEFAULT 0,
  subscription_tier TEXT,
  subscription_expires_at TIMESTAMPTZ,
  last_refill_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Function to ensure user exists (called from auth service)
CREATE OR REPLACE FUNCTION ensure_user_exists(
  auth_id UUID,
  email TEXT DEFAULT NULL,
  is_anonymous BOOLEAN DEFAULT true
) RETURNS JSON AS $$
DECLARE
  v_user users;
  v_credits user_credits;
BEGIN
  -- Insert or get user
  INSERT INTO users (auth_id, email, is_anonymous)
  VALUES (auth_id, email, is_anonymous)
  ON CONFLICT (auth_id)
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, users.email),
    is_anonymous = EXCLUDED.is_anonymous,
    updated_at = now()
  RETURNING * INTO v_user;

  -- Ensure credits exist
  INSERT INTO user_credits (user_id, balance)
  VALUES (v_user.id, 3)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING * INTO v_credits;

  -- Return combined data
  RETURN json_build_object(
    'id', v_user.id,
    'auth_id', v_user.auth_id,
    'email', v_user.email,
    'is_anonymous', v_user.is_anonymous,
    'credits', COALESCE(v_credits.balance, (SELECT balance FROM user_credits WHERE user_id = v_user.id))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can read own credits" ON user_credits
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

2. Payment System Simplification
Current Issues

Complex webhook handling
Unreliable credit updates
No subscription support
Poor error recovery

New Implementation
2.1 Stripe Service Refactor
typescript// lib/payments/stripe-service.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.basil',
});

export const PRICING = {
  credits: [
    { id: 'credit_10', amount: 10, price: 499, popular: false },
    { id: 'credit_30', amount: 30, price: 1299, popular: true },
    { id: 'credit_100', amount: 100, price: 3499, popular: false },
  ],
  subscriptions: {
    starter: {
      id: 'sub_starter',
      price_id: process.env.STRIPE_STARTER_PRICE_ID,
      credits: 50,
      price: 999
    },
    pro: {
      id: 'sub_pro',
      price_id: process.env.STRIPE_PRO_PRICE_ID,
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
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        user_id: userId,
        product_id: productId,
        type,
      },
      customer_email: undefined, // Will be filled by Stripe
      allow_promotion_codes: true,
    });

    return session.url!;
  }

  async verifySession(sessionId: string): Promise<PaymentResult> {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'subscription']
    });

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      throw new Error('Payment not completed');
    }

    return {
      userId: session.metadata!.user_id,
      productId: session.metadata!.product_id,
      type: session.metadata!.type as 'credits' | 'subscription',
      stripeCustomerId: session.customer as string,
      subscriptionId: session.subscription?.id,
    };
  }
}

export const stripeService = new StripeService();
2.2 Payment Success Handler
typescript// app/api/payments/success/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripeService, PRICING } from '@/lib/payments/stripe-service';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect('/pricing?error=missing_session');
  }

  try {
    // Verify payment with Stripe
    const result = await stripeService.verifySession(sessionId);

    // Update user credits based on payment type
    if (result.type === 'credits') {
      const product = PRICING.credits.find(p => p.id === result.productId);
      if (!product) throw new Error('Invalid product');

      await supabaseAdmin.rpc('add_credits', {
        user_id: result.userId,
        amount: product.amount,
        transaction_type: 'purchase',
        stripe_session_id: sessionId
      });

      return NextResponse.redirect(`/?success=credits_added&amount=${product.amount}`);

    } else if (result.type === 'subscription') {
      const subscription = Object.values(PRICING.subscriptions)
        .find(s => s.id === result.productId);

      if (!subscription) throw new Error('Invalid subscription');

      await supabaseAdmin.from('user_credits').update({
        subscription_tier: result.productId,
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        balance: subscription.credits,
      }).eq('user_id', result.userId);

      return NextResponse.redirect(`/?success=subscription_active&tier=${result.productId}`);
    }

  } catch (error) {
    console.error('Payment verification failed:', error);
    return NextResponse.redirect('/pricing?error=payment_failed');
  }
}

3. State Management with Zustand
3.1 User Store
typescript// lib/stores/user-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '@/lib/auth';

interface UserState {
  user: User | null;
  credits: number;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  spendCredit: (predictionId: string) => Promise<boolean>;
  refundCredit: (predictionId: string) => Promise<void>;
  purchaseCredits: (productId: string) => Promise<void>;
  upgradeAccount: (email: string, password: string) => Promise<void>;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      credits: 0,
      isLoading: false,
      isInitialized: false,

      initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true });
        try {
          const user = await authService.initialize();
          set({
            user,
            credits: user.credits,
            isInitialized: true,
            isLoading: false
          });
        } catch (error) {
          console.error('Failed to initialize user:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      spendCredit: async (predictionId: string) => {
        const { credits, user } = get();

        if (credits <= 0) {
          return false;
        }

        // Optimistic update
        set({ credits: credits - 1 });

        try {
          const response = await fetch('/api/credits/spend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user?.id,
              predictionId
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to spend credit');
          }

          return true;
        } catch (error) {
          // Rollback on failure
          set({ credits });
          console.error('Failed to spend credit:', error);
          return false;
        }
      },

      refundCredit: async (predictionId: string) => {
        const { credits, user } = get();

        try {
          const response = await fetch('/api/credits/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user?.id,
              predictionId
            }),
          });

          if (response.ok) {
            set({ credits: credits + 1 });
          }
        } catch (error) {
          console.error('Failed to refund credit:', error);
        }
      },

      purchaseCredits: async (productId: string) => {
        const { user } = get();
        if (!user) throw new Error('User not initialized');

        const response = await fetch('/api/payments/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            productId,
            type: 'credits'
          }),
        });

        const { url } = await response.json();
        window.location.href = url;
      },

      upgradeAccount: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const user = await authService.upgradeToEmail(email, password);
          set({ user, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      reset: () => {
        set({
          user: null,
          credits: 0,
          isInitialized: false
        });
      },
    }),
    {
      name: 'labubufy-user',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

4. Cloudflare R2 Storage Integration
4.1 R2 Service
typescript// lib/storage/r2-service.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export class R2StorageService {
  private bucket = process.env.R2_BUCKET_NAME!;
  private cdnUrl = process.env.R2_CDN_URL!;

  async uploadImage(
    userId: string,
    imageBlob: Blob,
    metadata: Record<string, string>
  ): Promise<string> {
    const key = `users/${userId}/images/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await R2.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      Metadata: metadata,
    }));

    // Return CDN URL
    return `${this.cdnUrl}/${key}`;
  }

  async getPresignedUploadUrl(userId: string): Promise<string> {
    const key = `users/${userId}/uploads/${Date.now()}.jpg`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: 'image/jpeg',
    });

    return getSignedUrl(R2, command, { expiresIn: 3600 });
  }

  async deleteImage(key: string): Promise<void> {
    // Implement if needed
  }
}

export const r2Storage = new R2StorageService();
4.2 Environment Variables
env# .env.local
# R2 Configuration
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=labubufy-images
R2_CDN_URL=https://cdn.labubufy.com

5. UI/UX Components
5.1 Smart Auth Prompt
typescript// components/auth/smart-auth-prompt.tsx
import { useUserStore } from '@/lib/stores/user-store';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';

export function SmartAuthPrompt() {
  const { user, credits } = useUserStore();
  const [shouldShow, setShouldShow] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    // Show prompt strategically
    const shouldPrompt =
      user?.is_anonymous &&
      credits > 0 &&
      credits < 3 && // After they've used at least one credit
      (!dismissedAt || Date.now() - dismissedAt > 3600000); // 1 hour cooldown

    setShouldShow(shouldPrompt);
  }, [user, credits, dismissedAt]);

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-xl shadow-xl p-6 animate-slide-up">
      <button
        onClick={() => {
          setShouldShow(false);
          setDismissedAt(Date.now());
        }}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>

      <h3 className="text-lg font-bold mb-2">
        Don't lose your {credits} credits! 💎
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        Save your account to access your credits from any device
      </p>

      <div className="space-y-2">
        <Button
          onClick={() => authService.signInWithProvider('google')}
          className="w-full flex items-center justify-center gap-2"
          variant="outline"
        >
          <FcGoogle className="w-5 h-5" />
          Continue with Google
        </Button>

        <Button
          onClick={() => authService.signInWithProvider('apple')}
          className="w-full flex items-center justify-center gap-2"
          variant="outline"
        >
          <FaApple className="w-5 h-5" />
          Continue with Apple
        </Button>
      </div>
    </div>
  );
}

6. Implementation Timeline
1: Foundation (Auth & Database)

 Set up new database schema
 Implement consolidated auth service
 Add social login support
 Create Zustand store
 Test anonymous user flow

2: Payments

 Implement Stripe checkout without webhooks
 Add server-side payment verification
 Create credit management system
 Add subscription support
 Test payment flows

3: Storage & Performance

 Set up Cloudflare R2
 Migrate from IndexedDB
 Implement image optimization
 Add CDN configuration
 Test upload/download flows

4: Polish & Launch

 Add error boundaries
 Implement smart auth prompts
 Add comprehensive logging
 Performance optimization
 Final testing & deployment


7. Testing Checklist
Auth Flow

 Anonymous user creation works on first visit
 Session persists across page refreshes
 Email upgrade preserves credits
 Social login works (Google, Apple)
 Sign out clears all data properly

Payment Flow

 Credit purchase completes successfully
 Credits are added immediately after payment
 Failed payments don't charge user
 Subscription sign-up works
 Subscription credits refill monthly

Generation Flow

 Credits deducted on generation start
 Failed generations refund credit
 Images saved to R2
 CDN delivers images quickly
 History syncs across devices


8. Monitoring & Error Handling
Add Error Tracking
typescript// lib/monitoring/index.ts
export function setupMonitoring() {
  // Vercel Analytics
  if (process.env.NEXT_PUBLIC_VERCEL_ENV) {
    import('@vercel/analytics').then(({ inject }) => inject());
  }

  // Global error handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Send to logging service
  });
}
API Route Error Wrapper
typescript// lib/api/with-error-handling.ts
export function withErrorHandling(handler: Function) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

9. Environment Setup
Required Environment Variables
env# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=

# Cloudflare R2
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_CDN_URL=

# App
NEXT_PUBLIC_APP_URL=

# Replicate (existing)
REPLICATE_API_TOKEN=

10. Migration Notes
Data Migration Strategy

Keep existing users table during transition
Run migration script to create new schema
Gradually migrate users as they log in
After 30 days, migrate remaining dormant accounts
Clean up old tables

Rollback Plan

Keep database backups before migration
Feature flag new auth system
Monitor error rates closely
Have quick rollback script ready
Maintain old code in separate branch for 30 days


Questions for Engineering Team

Database Access: Do we have admin access to run migrations?
Stripe Account: Are webhook endpoints already configured?
R2 Setup: Is Cloudflare account ready with R2 enabled?
Monitoring: Which error tracking service should we use?
Testing: Do we have a staging environment set up?


Success Metrics

Auth Success Rate: >99% of users successfully create accounts
Payment Success Rate: >95% of checkout sessions complete
Credit Accuracy: 0 cases of incorrect credit balance
Performance: <500ms page load time
Error Rate: <0.1% API error rate

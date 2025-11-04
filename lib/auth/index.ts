// lib/auth/index.ts
// Consolidated authentication service with retry logic and social login support
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

const AuthSchema = {
  email: z.string().email(),
  password: z.string().min(6),
};

export interface User {
  id: string;
  auth_id: string; // This is auth_user_id from the database
  email: string | null;
  is_anonymous: boolean;
  credits: number;
  total_purchased?: number;
  total_spent?: number;
}

export class AuthService {
  private static instance: AuthService;
  private supabase = createClient(supabaseUrl, supabaseAnonKey);

  private constructor() {
    // Private constructor for singleton pattern
  }

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
        if (error) throw error;

        if (data?.user) {
          return this.ensureUserRecord(data.user);
        }
      } catch (error) {
        console.error(`Anonymous user creation attempt ${i + 1} failed:`, error);
        if (i === attempts - 1) {
          throw new Error('Failed to create anonymous user after multiple attempts');
        }
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
    throw new Error('Failed to create anonymous user');
  }

  private async ensureUserRecord(authUser: { id: string; email?: string | null; is_anonymous?: boolean }): Promise<User> {
    // Ensure user exists in our database with credits
    const { data, error } = await this.supabase.rpc('ensure_user_exists', {
      auth_id: authUser.id,
      email: authUser.email || null,
      is_anonymous: authUser.is_anonymous ?? true
    });

    if (error) {
      console.error('Error ensuring user record:', error);
      throw new Error(`Failed to ensure user record: ${error.message}`);
    }

    // Parse the JSON response
    const userData = data as any;
    return {
      id: userData.id,
      auth_id: userData.auth_user_id, // Function returns auth_user_id
      email: userData.email,
      is_anonymous: userData.is_anonymous,
      credits: userData.credits || 0,
      total_purchased: userData.total_purchased || 0,
      total_spent: userData.total_spent || 0
    };
  }

  async upgradeToEmail(email: string, password: string): Promise<User> {
    const validated = AuthSchema.email.parse(email);
    const validatedPassword = AuthSchema.password.parse(password);

    const { data, error } = await this.supabase.auth.updateUser({
      email: validated,
      password: validatedPassword
    });

    if (error) {
      throw new Error(`Failed to upgrade account: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('No user returned from update');
    }

    // Update user record
    const { error: updateError } = await this.supabase
      .from('users')
      .update({
        email: validated,
        is_anonymous: false
      })
      .eq('auth_user_id', data.user.id);

    if (updateError) {
      console.error('Failed to update user record:', updateError);
      // Continue anyway as the auth update succeeded
    }

    return this.ensureUserRecord(data.user);
  }

  async signInWithProvider(provider: 'google' | 'apple'): Promise<void> {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const { error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${baseUrl}/auth/callback`
      }
    });

    if (error) {
      throw new Error(`Failed to sign in with ${provider}: ${error.message}`);
    }
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const validatedEmail = AuthSchema.email.parse(email);

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: validatedEmail,
      password
    });

    if (error) {
      throw new Error(`Failed to sign in: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('No user returned from sign in');
    }

    return this.ensureUserRecord(data.user);
  }

  async signUpWithEmail(email: string, password: string): Promise<User> {
    const validatedEmail = AuthSchema.email.parse(email);
    const validatedPassword = AuthSchema.password.parse(password);

    const { data, error } = await this.supabase.auth.signUp({
      email: validatedEmail,
      password: validatedPassword
    });

    if (error) {
      throw new Error(`Failed to sign up: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('No user returned from sign up');
    }

    return this.ensureUserRecord(data.user);
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error(`Failed to sign out: ${error.message}`);
    }
  }

  getSupabaseClient() {
    return this.supabase;
  }
}

export const authService = AuthService.getInstance();


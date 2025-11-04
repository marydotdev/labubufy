// lib/auth-service.ts - IMPROVED VERSION
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export interface AppUser {
  id: string;
  auth_user_id: string;
  email: string | null;
  is_anonymous: boolean;
  credits: number;
  total_purchased: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: "purchase" | "spend" | "refund" | "welcome" | "bonus";
  amount: number;
  description: string;
  metadata?: Record<string, string>;
  created_at: string;
}

class AuthService {
  private currentUser: User | null = null;
  private userCredits: AppUser | null = null;

  constructor() {
    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, session?.user?.id);
      if (session?.user) {
        this.currentUser = session.user;
      } else {
        this.currentUser = null;
        this.userCredits = null;
      }
    });
  }

  // Initialize user (create anonymous if needed)
  async initializeUser(): Promise<AppUser> {
    try {
      console.log("🔄 Initializing user...");

      // Check for existing session first
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        console.log("✅ Found existing user:", session.user.id);
        this.currentUser = session.user;
        return await this.getOrCreateUserCredits(session.user.id);
      }

      console.log("No existing user, creating anonymous user");

      // Create anonymous user
      console.log("🔐 Creating anonymous user...");
      const { data: authData, error: authError } =
        await supabase.auth.signInAnonymously();

      if (authError) {
        console.error("❌ Anonymous sign-in error:", authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error("No user returned from anonymous sign-in");
      }

      console.log("✅ Anonymous user created:", authData.user.id);
      this.currentUser = authData.user;

      // Get or create user credits via server-side API
      return await this.getOrCreateUserCredits(authData.user.id);
    } catch (error) {
      console.error("❌ Failed to initialize user:", error);
      throw new Error(`Failed to initialize user session`);
    }
  }

  // Get or create user credits (calls server-side API)
  async getOrCreateUserCredits(userId: string): Promise<AppUser> {
    try {
      console.log("💰 Getting/creating user credits for:", userId);

      // Get the current session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      // Call server-side API to initialize user
      const response = await fetch("/api/users/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to initialize user");
      }

      console.log("✅ User credits initialized:", result.user);
      this.userCredits = result.user;
      return result.user;
    } catch (error) {
      console.error("❌ Failed to get/create user credits:", error);
      throw new Error(
        `Failed to initialize user credits: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Refresh user credits from database
  async refreshUserCredits(): Promise<AppUser> {
    if (!this.currentUser) {
      throw new Error("No authenticated user");
    }

    const { data: credits, error } = await supabase
      .from("user_credits")
      .select("*")
      .eq("auth_user_id", this.currentUser.id)
      .single();

    if (error || !credits) {
      throw new Error("Failed to fetch user credits");
    }

    this.userCredits = credits;
    return credits;
  }

  // Get current user credits (from cache)
  getUserCredits(): AppUser | null {
    return this.userCredits;
  }

  // Get current auth user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Sign up with email - with duplicate prevention
  async signUpWithEmail(email: string, password: string): Promise<AppUser> {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (error) {
      // Check for duplicate email error
      if (error.message.includes("already registered")) {
        throw new Error(
          "This email is already registered. Please sign in instead."
        );
      }
      throw error;
    }

    if (!data.user) throw new Error("No user returned");

    this.currentUser = data.user;
    return await this.getOrCreateUserCredits(data.user.id);
  }

  // Sign in with email
  async signInWithEmail(email: string, password: string): Promise<AppUser> {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error("No user returned");

    this.currentUser = data.user;
    return await this.refreshUserCredits();
  }

  // Link email to anonymous account - with duplicate prevention
  async linkEmail(email: string, password: string): Promise<AppUser> {
    if (!this.currentUser || !this.currentUser.is_anonymous) {
      throw new Error("Can only link email to anonymous accounts");
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await supabase.auth.updateUser({
      email: normalizedEmail,
      password,
    });

    if (error) {
      // Check for duplicate email error
      if (error.message.includes("already registered")) {
        throw new Error(
          "This email is already registered. Please sign in instead."
        );
      }
      throw error;
    }

    if (!data.user) throw new Error("No user returned");

    // Update user credits record
    const { error: updateError } = await supabase
      .from("user_credits")
      .update({
        email: normalizedEmail,
        is_anonymous: false,
      })
      .eq("auth_user_id", this.currentUser.id);

    if (updateError) {
      console.error("Failed to update user credits:", updateError);
    }

    this.currentUser = data.user;
    return await this.refreshUserCredits();
  }

  // Sign out
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.currentUser = null;
    this.userCredits = null;
  }
}

export const authService = new AuthService();

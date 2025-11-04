// lib/user-service.ts - FIXED VERSION
import {
  authService,
  type AppUser,
  type CreditTransaction,
} from "./auth-service";
import { supabase } from "./supabase";

class UserService {
  // Initialize and get user (creates anonymous user if needed)
  async getOrCreateUser(): Promise<AppUser> {
    try {
      return await authService.initializeUser();
    } catch (error) {
      console.error("Failed to initialize user:", error);
      throw new Error(
        `Failed to initialize user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Check if user can generate (has credits)
  async canGenerate(): Promise<{ canGenerate: boolean; credits: number }> {
    const user = authService.getUserCredits();
    if (!user) {
      throw new Error("User not authenticated");
    }

    return {
      canGenerate: user.credits >= 1,
      credits: user.credits,
    };
  }

  // Spend credits (server-side validation via API)
  async spendCredits(predictionId: string): Promise<AppUser> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("No active session");
    }

    const response = await fetch("/api/credits/spend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ predictionId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to spend credits");
    }

    return await authService.refreshUserCredits();
  }

  // Refund credits (server-side via API)
  async refundCredits(predictionId: string): Promise<AppUser> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("No active session");
    }

    const response = await fetch("/api/credits/refund", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ predictionId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to refund credits");
    }

    return await authService.refreshUserCredits();
  }

  // Get transaction history
  async getTransactionHistory(): Promise<CreditTransaction[]> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const { data: transactions, error } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return transactions || [];
  }

  // Get current user
  getCurrentUser(): AppUser | null {
    return authService.getUserCredits();
  }

  // Refresh user credits
  async refreshUserCredits(): Promise<AppUser> {
    return await authService.refreshUserCredits();
  }

  // Link email to anonymous account - FIXED with duplicate check
  async linkEmail(email: string, password: string): Promise<AppUser> {
    // Check if email already exists in user_credits table
    const { data: existingUser } = await supabase
      .from("user_credits")
      .select("id, email, auth_user_id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      throw new Error(
        "This email is already registered. Please sign in instead."
      );
    }

    return await authService.linkEmail(email, password);
  }

  // Sign in with email
  async signInWithEmail(email: string, password: string): Promise<AppUser> {
    return await authService.signInWithEmail(email, password);
  }

  // Sign up with email - FIXED with duplicate check
  async signUpWithEmail(email: string, password: string): Promise<AppUser> {
    // Check if email already exists in user_credits table
    const { data: existingUser } = await supabase
      .from("user_credits")
      .select("id, email, auth_user_id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      throw new Error(
        "This email is already registered. Please sign in instead."
      );
    }

    return await authService.signUpWithEmail(email, password);
  }

  // Sign out
  async signOut(): Promise<void> {
    return await authService.signOut();
  }

  // Check if user is anonymous
  isAnonymous(): boolean {
    const user = authService.getUserCredits();
    return user?.is_anonymous ?? true;
  }

  // Merge anonymous account with existing account
  async mergeAnonymousAccount(
    email: string,
    password: string
  ): Promise<AppUser> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.is_anonymous) {
      throw new Error("Can only merge anonymous accounts");
    }

    // First, sign in with email to get the target account
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("No user returned");

      // Get both user credits records
      const { data: anonymousCredits } = await supabase
        .from("user_credits")
        .select("credits, total_purchased, total_spent")
        .eq("auth_user_id", currentUser.id)
        .single();

      const { data: targetCredits } = await supabase
        .from("user_credits")
        .select("id, credits, total_purchased, total_spent")
        .eq("auth_user_id", data.user.id)
        .single();

      if (anonymousCredits && targetCredits) {
        // Merge credits into the target account
        const { error: updateError } = await supabase
          .from("user_credits")
          .update({
            credits: targetCredits.credits + anonymousCredits.credits,
            total_purchased:
              targetCredits.total_purchased + anonymousCredits.total_purchased,
            total_spent:
              targetCredits.total_spent + anonymousCredits.total_spent,
          })
          .eq("id", targetCredits.id);

        if (updateError) {
          console.error("Failed to merge credits:", updateError);
        }

        // Delete the anonymous account record
        await supabase
          .from("user_credits")
          .delete()
          .eq("auth_user_id", currentUser.id);
      }

      return await authService.refreshUserCredits();
    } catch (error) {
      throw new Error(
        `Failed to merge accounts: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export const userService = new UserService();

// Export types for use in components
export type { AppUser, CreditTransaction };

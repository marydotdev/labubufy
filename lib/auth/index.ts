// lib/auth/index.ts
// Consolidated authentication service with retry logic and social login support
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { generateBrowserFingerprint } from "@/lib/utils/ip-fingerprint";

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
  private supabase = supabase; // Use shared client instance

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
    // Generate browser fingerprint for abuse prevention
    const browserFingerprint =
      typeof window !== "undefined" ? generateBrowserFingerprint() : null;

    // 1. Check for existing session
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (session?.user) {
      const user = await this.ensureUserRecord(
        session.user,
        browserFingerprint
      );

      // If this is a new anonymous user and we have a stored anonymous auth_id, try to restore credits
      
      if (session.user.is_anonymous && typeof window !== "undefined") {
        const storedAnonymousAuthId = localStorage.getItem(
          "labubufy_anonymous_auth_id"
        );
        if (
          storedAnonymousAuthId &&
          storedAnonymousAuthId !== session.user.id
        ) {

          try {
            const token = await this.getAccessToken();
            if (token) {
              const restoreResponse = await fetch(
                "/api/users/restore-anonymous",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    storedAnonymousAuthId,
                    browserFingerprint,
                  }),
                }
              );

              if (restoreResponse.ok) {
                const restoreResult = await restoreResponse.json();
                if (
                  restoreResult.restored &&
                  restoreResult.credits !== undefined
                ) {
                  // Update user object with restored credits
                  user.credits = restoreResult.credits;
                }
              }
            }
          } catch (error) {
            console.error("Failed to restore anonymous user credits:", error);
          }
        }
      }

      return user;
    }

    // 2. Create anonymous user with retry logic
    // Check if we have a stored anonymous user ID to restore

    return this.createAnonymousUserWithRetry(
      3,
      browserFingerprint,
      storedAnonymousAuthId
    );
  }

  private async createAnonymousUserWithRetry(
    attempts = 3,
    browserFingerprint?: string | null,
    storedAnonymousAuthId?: string | null
  ): Promise<User> {

    for (let i = 0; i < attempts; i++) {
      
      try {
        const { data, error } = await this.supabase.auth.signInAnonymously();
        
        if (error) throw error;

        if (data?.user) {

          // Ensure user record exists first
          const user = await this.ensureUserRecord(
            data.user,
            browserFingerprint
          );

          // Store anonymous user ID for potential restoration after sign-out
          // Only store if we're not restoring from a previous anonymous user
          if (
            typeof window !== "undefined" &&
            data.user.is_anonymous &&
            !storedAnonymousAuthId
          ) {
            localStorage.setItem("labubufy_anonymous_auth_id", data.user.id);
          }

          // If we have a stored anonymous auth_id, try to restore credits
          if (
            storedAnonymousAuthId &&
            storedAnonymousAuthId !== data.user.id &&
            typeof window !== "undefined"
          ) {
            
            try {
              const token = await this.getAccessToken();
              if (token) {
                const restoreResponse = await fetch(
                  "/api/users/restore-anonymous",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      storedAnonymousAuthId,
                      browserFingerprint,
                    }),
                  }
                );

                if (restoreResponse.ok) {
                  const restoreResult = JSON.parse(restoreResponseText);
                  
                  if (
                    restoreResult.restored &&
                    restoreResult.credits !== undefined
                  ) {
                    // Update user object with restored credits
                    user.credits = restoreResult.credits;
                  }
                }
              }
            } catch (error) {
              console.error("Failed to restore anonymous user credits:", error);
              
              // Continue with new user if restoration fails
            }
          }

          return user;
        }
      } catch (error) {
        console.error(
          `Anonymous user creation attempt ${i + 1} failed:`,
          error
        );
        
        if (i === attempts - 1) {
          throw new Error(
            "Failed to create anonymous user after multiple attempts"
          );
        }
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      }
    }
    
    throw new Error("Failed to create anonymous user");
  }

  private async ensureUserRecord(
    authUser: { id: string; email?: string | null; is_anonymous?: boolean },
    browserFingerprint?: string | null
  ): Promise<User> {
    
    // For client-side calls, we can't get IP directly, so we'll call via API route
    // which can get the IP server-side
    if (typeof window !== "undefined") {
      // Client-side: call API route which can get IP
      const token = await this.getAccessToken();
      
      if (!token) {
        throw new Error("No session token available");
      }

      const response = await fetch("/api/users/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          browserFingerprint: browserFingerprint || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        throw new Error(errorData.error || "Failed to initialize user");
      }

      const result = await response.json();
      
      return result.user;
    } else {
      // Server-side: call RPC directly (IP will be null, but that's okay for server-side)
      const { data, error } = await this.supabase.rpc("ensure_user_exists", {
        auth_id: authUser.id,
        email: authUser.email || null,
        is_anonymous: authUser.is_anonymous ?? true,
        ip_address: null, // Can't get IP in server-side RPC call
        browser_fingerprint: browserFingerprint || null,
      });

      if (error) {
        console.error("Error ensuring user record:", error);
        throw new Error(`Failed to ensure user record: ${error.message}`);
      }

      // Parse the JSON response
      const userData = data as any;
      return {
        id: userData.id,
        auth_id: userData.auth_user_id || userData.auth_id, // Function returns auth_user_id
        email: userData.email,
        is_anonymous: userData.is_anonymous,
        credits: userData.credits || 0,
        total_purchased: userData.total_purchased || 0,
        total_spent: userData.total_spent || 0,
      };
    }
  }

  async upgradeToEmail(email: string, password: string): Promise<User> {
    const validated = AuthSchema.email.parse(email);
    const validatedPassword = AuthSchema.password.parse(password);

    const { data, error } = await this.supabase.auth.updateUser({
      email: validated,
      password: validatedPassword,
    });

    if (error) {
      throw new Error(`Failed to upgrade account: ${error.message}`);
    }

    if (!data.user) {
      throw new Error("No user returned from update");
    }

    // Update user record
    const { error: updateError } = await this.supabase
      .from("users")
      .update({
        email: validated,
        is_anonymous: false,
      })
      .eq("auth_user_id", data.user.id);

    if (updateError) {
      console.error("Failed to update user record:", updateError);
      // Continue anyway as the auth update succeeded
    }

    const browserFingerprint =
      typeof window !== "undefined" ? generateBrowserFingerprint() : null;
    return this.ensureUserRecord(data.user, browserFingerprint);
  }

  async signInWithProvider(provider: "google" | "apple"): Promise<void> {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${baseUrl}/auth/callback`,
      },
    });

    if (error) {
      throw new Error(`Failed to sign in with ${provider}: ${error.message}`);
    }
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      console.log("🔐 AuthService: Starting sign in for:", email);
      const validatedEmail = AuthSchema.email.parse(email);

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: validatedEmail,
        password,
      });

      if (error) {
        console.error("❌ AuthService: Sign in error:", error);
        // Provide user-friendly error messages
        if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("Email not confirmed") ||
          error.message.includes("Invalid login")
        ) {
          throw new Error(
            "Invalid email or password. Please check your credentials and try again."
          );
        }
        throw new Error(`Sign in failed: ${error.message}`);
      }

      if (!data.user) {
        console.error("❌ AuthService: No user returned from sign in");
        throw new Error("No user returned from sign in");
      }

      console.log("✅ AuthService: Sign in successful, ensuring user record");
      const browserFingerprint =
        typeof window !== "undefined" ? generateBrowserFingerprint() : null;
      const user = await this.ensureUserRecord(data.user, browserFingerprint);
      console.log("✅ AuthService: User record ensured:", user);
      return user;
    } catch (error) {
      console.error("❌ AuthService: Sign in exception:", error);
      // Re-throw validation errors as-is
      if (error instanceof z.ZodError) {
        throw new Error("Please enter a valid email address");
      }
      throw error;
    }
  }

  async signUpWithEmail(email: string, password: string): Promise<User> {
    try {
      const validatedEmail = AuthSchema.email.parse(email);
      const validatedPassword = AuthSchema.password.parse(password);

      const { data, error } = await this.supabase.auth.signUp({
        email: validatedEmail,
        password: validatedPassword,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });

      if (error) {
        // Provide user-friendly error messages
        if (
          error.message.includes("already registered") ||
          error.message.includes("already exists")
        ) {
          throw new Error(
            "This email is already registered. Please sign in instead."
          );
        }
        if (error.message.includes("Password")) {
          throw new Error("Password must be at least 6 characters long.");
        }
        throw new Error(`Sign up failed: ${error.message}`);
      }

      if (!data.user) {
        throw new Error("No user returned from sign up");
      }

      // Check if we have a session (email confirmation disabled) or need to wait
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      const browserFingerprint =
        typeof window !== "undefined" ? generateBrowserFingerprint() : null;

      if (session) {
        // Email confirmation is disabled - we have a session immediately
        console.log(
          "✅ Sign up: Session available immediately (email confirmation disabled)"
        );
        return this.ensureUserRecord(data.user, browserFingerprint);
      } else {
        // Email confirmation is enabled - user needs to confirm email
        console.log("⚠️ Sign up: Email confirmation required");
        // Still create the user record, but they'll need to confirm email to sign in
        const user = await this.ensureUserRecord(data.user, browserFingerprint);
        // Throw a specific error so the UI can handle it
        throw new Error(
          "EMAIL_CONFIRMATION_REQUIRED: Please check your email to confirm your account before signing in."
        );
      }
    } catch (error) {
      // Don't wrap EMAIL_CONFIRMATION_REQUIRED errors
      if (
        error instanceof Error &&
        error.message.includes("EMAIL_CONFIRMATION_REQUIRED")
      ) {
        throw error;
      }

      // Re-throw validation errors as-is
      if (error instanceof z.ZodError) {
        if (error.errors.find((e) => e.path.includes("email"))) {
          throw new Error("Please enter a valid email address");
        }
        if (error.errors.find((e) => e.path.includes("password"))) {
          throw new Error("Password must be at least 6 characters long");
        }
      }
      throw error;
    }
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

  async getAccessToken(): Promise<string | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session?.access_token || null;
  }
}

export const authService = AuthService.getInstance();

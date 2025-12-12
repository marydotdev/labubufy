// lib/stores/user-store.ts
// Zustand store for user state management
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authService, type User } from "@/lib/auth";

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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: "google" | "apple") => Promise<void>;
  signOut: () => Promise<void>;
  refreshCredits: () => Promise<void>;
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
        if (get().isInitialized && get().user) {
          // Already initialized, just refresh credits
          await get().refreshCredits();
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authService.initialize();

          set({
            user,
            credits: user.credits,
            isInitialized: true,
            isLoading: false,
          });
        } catch (error) {
          console.error("Failed to initialize user:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      spendCredit: async (predictionId: string) => {
        const { credits, user } = get();

        if (credits <= 0 || !user) {
          return false;
        }

        // Get auth token
        const token = await authService.getAccessToken();

        if (!token) {
          console.error("No session token available");
          return false;
        }

        // Optimistic update
        const oldCredits = credits;
        set({ credits: credits - 1 });

        try {
          const response = await fetch("/api/credits/spend", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              predictionId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to spend credit");
          }

          // Refresh credits from server
          await get().refreshCredits();
          return true;
        } catch (error) {
          // Rollback on failure
          set({ credits: oldCredits });
          console.error("Failed to spend credit:", error);
          return false;
        }
      },

      refundCredit: async (predictionId: string) => {
        const { user } = get();

        if (!user) {
          console.error("Cannot refund credit: user not initialized");
          return;
        }

        // Get auth token
        const token = await authService.getAccessToken();

        if (!token) {
          console.error("No session token available for refund");
          return;
        }

        try {
          const response = await fetch("/api/credits/refund", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              predictionId,
            }),
          });

          if (response.ok) {
            // Refresh credits from server
            await get().refreshCredits();
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error("Refund failed:", errorData.error || "Unknown error");
          }
        } catch (error) {
          console.error("Failed to refund credit:", error);
        }
      },

      purchaseCredits: async (productId: string) => {
        const { user } = get();
        if (!user) throw new Error("User not initialized");

        const response = await fetch("/api/credits/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            packageId: productId,
            successUrl: `${window.location.origin}/?payment=success`,
            cancelUrl: `${window.location.origin}/?payment=canceled`,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create checkout session");
        }

        if (result.url) {
          window.location.href = result.url;
        }
      },

      upgradeAccount: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const user = await authService.upgradeToEmail(email, password);
          set({
            user,
            credits: user.credits,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      signInWithEmail: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          // Store anonymous user ID before signing in (if current user is anonymous)
          const currentUser = get().user;

          if (currentUser?.is_anonymous && typeof window !== "undefined") {
            localStorage.setItem(
              "labubufy_anonymous_auth_id",
              currentUser.auth_id
            );
          }

          console.log("🔐 Signing in with email:", email);
          const user = await authService.signInWithEmail(email, password);
          console.log("✅ Sign in successful, user:", user);

          set({
            user,
            credits: user.credits,
            isInitialized: true,
            isLoading: false,
          });

          console.log("✅ User store updated after sign in");
        } catch (error) {
          console.error("❌ Sign in error:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      signUpWithEmail: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          // Store anonymous user ID before signing up (if current user is anonymous)
          const currentUser = get().user;
          if (currentUser?.is_anonymous && typeof window !== "undefined") {
            localStorage.setItem(
              "labubufy_anonymous_auth_id",
              currentUser.auth_id
            );
          }

          console.log("🔐 Signing up with email:", email);
          const user = await authService.signUpWithEmail(email, password);
          console.log("✅ Sign up successful, user:", user);

          // Check if we have a session (email confirmation might be disabled)
          const supabase = authService.getSupabaseClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            // We have a session - update store
            set({
              user,
              credits: user.credits,
              isInitialized: true,
              isLoading: false,
            });
            console.log("✅ User store updated after sign up (with session)");
          } else {
            // No session - email confirmation required
            // Still update user but mark that confirmation is needed
            set({
              user,
              credits: user.credits,
              isInitialized: true,
              isLoading: false,
            });
            console.log(
              "⚠️ User store updated but email confirmation required"
            );
            throw new Error("EMAIL_CONFIRMATION_REQUIRED");
          }
        } catch (error) {
          console.error("❌ Sign up error:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      signInWithProvider: async (provider: "google" | "apple") => {
        try {
          await authService.signInWithProvider(provider);
          // OAuth redirect will happen, user will be initialized on callback
        } catch (error) {
          console.error(`Failed to sign in with ${provider}:`, error);
          throw error;
        }
      },

      signOut: async () => {
        try {
          await authService.signOut();

          get().reset();
        } catch (error) {
          console.error("Failed to sign out:", error);
          throw error;
        }
      },

      refreshCredits: async () => {
        const { user } = get();
        if (!user) return;

        try {
          // Get fresh user data via API route (which handles IP/fingerprint properly)
          const token = await authService.getAccessToken();
          if (!token) {
            console.error("No session token available for refresh");
            return;
          }

          // Generate browser fingerprint for tracking
          const browserFingerprint =
            typeof window !== "undefined"
              ? await import("@/lib/utils/ip-fingerprint").then((m) =>
                  m.generateBrowserFingerprint()
                )
              : null;

          const response = await fetch("/api/users/initialize", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              browserFingerprint: browserFingerprint,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.user) {
              set({
                user: result.user,
                credits: result.user.credits || 0,
              });
            }
          } else {
            console.error("Failed to refresh credits:", await response.text());
          }
        } catch (error) {
          console.error("Failed to refresh credits:", error);
        }
      },

      reset: () => {
        set({
          user: null,
          credits: 0,
          isInitialized: false,
          isLoading: false,
        });
      },
    }),
    {
      name: "labubufy-user",
      storage: createJSONStorage(() => localStorage),
      // Only persist user and credits, not loading states
      partialize: (state) => ({
        user: state.user,
        credits: state.credits,
        isInitialized: state.isInitialized,
      }),
    }
  )
);

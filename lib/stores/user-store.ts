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

        // Optimistic update
        const oldCredits = credits;
        set({ credits: credits - 1 });

        try {
          const response = await fetch("/api/credits/spend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user?.id,
              predictionId,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to spend credit");
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

        try {
          const response = await fetch("/api/credits/refund", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              predictionId,
            }),
          });

          if (response.ok) {
            // Refresh credits from server
            await get().refreshCredits();
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
          const user = await authService.signInWithEmail(email, password);
          set({
            user,
            credits: user.credits,
            isInitialized: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      signUpWithEmail: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const user = await authService.signUpWithEmail(email, password);
          set({
            user,
            credits: user.credits,
            isInitialized: true,
            isLoading: false,
          });
        } catch (error) {
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
          // Get fresh user data from auth service
          const supabase = authService.getSupabaseClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user) {
            const { data, error } = await supabase.rpc("ensure_user_exists", {
              auth_id: session.user.id,
              email: session.user.email,
              is_anonymous: session.user.is_anonymous ?? true,
            });

            if (!error && data) {
              const userData = data as {
                id: string;
                auth_user_id: string;
                email: string | null;
                is_anonymous: boolean;
                credits: number;
                total_purchased?: number;
                total_spent?: number;
              };
              set({
                user: {
                  id: userData.id,
                  auth_id: userData.auth_user_id, // Function returns auth_user_id
                  email: userData.email,
                  is_anonymous: userData.is_anonymous,
                  credits: userData.credits || 0,
                  total_purchased: userData.total_purchased || 0,
                  total_spent: userData.total_spent || 0,
                },
                credits: userData.credits || 0,
              });
            }
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
      storage: createJSONStorage(() => sessionStorage),
      // Only persist user and credits, not loading states
      partialize: (state) => ({
        user: state.user,
        credits: state.credits,
        isInitialized: state.isInitialized,
      }),
    }
  )
);

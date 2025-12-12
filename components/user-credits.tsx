// components/user-credits.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Coins, Plus, History, ShoppingCart, X, Gift } from "lucide-react";
import { useUserStore } from "@/lib/stores/user-store";
import { PRICING } from "@/lib/payments/stripe-service";
import { supabase } from "@/lib/supabase";

// Type for credit packages
type CreditPackage = {
  id: string;
  amount: number;
  price: number;
  popular?: boolean;
};

// Map PRICING.credits to match the old CreditPackage interface
const CREDIT_PACKAGES: (CreditPackage & { name: string; credits: number })[] = PRICING.credits.map(pkg => ({
  id: pkg.id,
  amount: pkg.amount,
  credits: pkg.amount, // Map amount to credits for compatibility
  name: `${pkg.amount} Credits`, // Generate name from amount
  price: pkg.price,
  popular: pkg.popular,
}));
import { cn } from "@/lib/utils";

// Type for credit events from the new schema
interface CreditEvent {
  id: string;
  user_id: string;
  type: "welcome" | "purchase" | "spend" | "refund";
  amount: number;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface CreditsDisplayProps {
  onCreditsUpdate?: (credits: number) => void;
  className?: string;
}

export function CreditsDisplay({
  onCreditsUpdate,
  className,
}: CreditsDisplayProps) {
  const { user, credits, isInitialized, isLoading, initialize } = useUserStore();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize().catch(console.error);
    }
  }, [isInitialized, isLoading, initialize]);

  // Notify parent of credits update
  useEffect(() => {
    if (user && credits !== undefined) {
      onCreditsUpdate?.(credits);
    }
  }, [credits, user, onCreditsUpdate]);

  if (isLoading || !isInitialized) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className="bg-yellow-500 rounded-full px-4 py-2 flex items-center gap-2 hover:bg-yellow-600 transition-colors cursor-pointer"
          onClick={() => setShowPurchaseModal(true)}
        >
          <Coins className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-lg">
            {credits || 0}
          </span>
        </div>

        {/* <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPurchaseModal(true)}
          className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          Buy
        </Button> */}

        {/* <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistoryModal(true)}
          className="border-gray-300"
        >
          <History className="w-4 h-4" />
        </Button> */}
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && user && (
        <CreditPurchaseModal
          userId={user.id}
          onClose={() => setShowPurchaseModal(false)}
          onPurchaseComplete={() => {
            // Credits will be refreshed by the store automatically
          }}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && user && (
        <CreditHistoryModal onClose={() => setShowHistoryModal(false)} />
      )}
    </>
  );
}

interface CreditPurchaseModalProps {
  userId: string;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

function CreditPurchaseModal({
  userId,
  onClose,
  onPurchaseComplete,
}: CreditPurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(
    null
  );

  const handlePurchase = async (pkg: CreditPackage) => {
    try {
      setLoading(true);
      setSelectedPackage(pkg);

      console.log("Starting purchase with userId:", userId); // Debug log

      // Validate userId before sending
      if (!userId || userId.trim() === "") {
        throw new Error(
          "User ID is missing. Please refresh the page and try again."
        );
      }

      // Create Stripe checkout session
      const requestBody = {
        userId: userId.trim(),
        packageId: pkg.id,
        successUrl: `${window.location.origin}?payment=success`,
        cancelUrl: `${window.location.origin}?payment=cancelled`,
      };

      console.log("Sending request body:", requestBody); // Debug log

      const response = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status); // Debug log

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Error response:", errorText); // Debug log
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("Response result:", result); // Debug log

      if (result.success && result.url) {
        console.log("Redirecting to:", result.url);
        window.location.href = result.url;
      } else {
        throw new Error(result.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Purchase failed:", error);
      alert(
        `Purchase failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
      setSelectedPackage(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Buy Credits</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Debug info */}
        <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
          <strong>Debug:</strong> User ID: {userId || "NOT SET"}
        </div>

        <div className="space-y-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                "border-2 rounded-lg p-4 cursor-pointer transition-all relative",
                pkg.popular
                  ? "border-violet-500 bg-violet-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => handlePurchase(pkg)}
            >
              {pkg.popular && (
                <div className="absolute -top-2 left-4 bg-violet-500 text-white text-xs px-2 py-1 rounded">
                  Most Popular
                </div>
              )}

              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{pkg.name}</h3>
                  <p className="text-gray-600">
                    ${(pkg.price / 100).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-violet-600">
                    {pkg.credits.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    ${(pkg.price / 100 / pkg.credits).toFixed(3)} per credit
                  </div>
                </div>
              </div>

              {loading && selectedPackage?.id === pkg.id && (
                <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Credits never expire • Secure payment via Stripe</p>
        </div>
      </div>
    </div>
  );
}

interface CreditHistoryModalProps {
  onClose: () => void;
}

function CreditHistoryModal({ onClose }: CreditHistoryModalProps) {
  const { user } = useUserStore();
  const [transactions, setTransactions] = useState<CreditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Query credit_events table using user's auth_id (which is auth_user_id)
      const { data, error } = await supabase
        .from("credit_events")
        .select("*")
        .eq("user_id", user.auth_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }

      setTransactions((data as CreditEvent[]) || []);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <ShoppingCart className="w-4 h-4 text-green-600" />;
      case "spend":
        return <Coins className="w-4 h-4 text-red-600" />;
      case "refund":
        return <Coins className="w-4 h-4 text-blue-600" />;
      case "welcome":
        return <Gift className="w-4 h-4 text-purple-600" />;
      default:
        return <Coins className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Credit History</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-96 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  {getTransactionIcon(transaction.type)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "font-bold",
                      transaction.amount > 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {transaction.amount > 0 ? "+" : ""}
                    {transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

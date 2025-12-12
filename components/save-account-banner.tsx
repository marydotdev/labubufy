// components/save-account-banner.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";
import { useUserStore } from "@/lib/stores/user-store";

interface SaveAccountBannerProps {
  onSaveClick: () => void;
}

export function SaveAccountBanner({ onSaveClick }: SaveAccountBannerProps) {
  const { user, credits } = useUserStore();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed (stored in localStorage)
    const dismissed = localStorage.getItem("save_account_banner_dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  // Derived state
  const isAnonymous = user?.is_anonymous ?? true;
  const hasCredits = (credits || 0) > 0;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("save_account_banner_dismissed", "true");
  };

  // Don't show if user is not anonymous, has no credits, or dismissed
  if (!isAnonymous || !hasCredits || isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Shield className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm sm:text-base">
                Protect Your Credits!
              </p>
              <p className="text-xs sm:text-sm text-violet-100">
                Save your account to access credits from any device
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={onSaveClick}
              size="sm"
              className="bg-white text-violet-600 hover:bg-violet-50 font-semibold"
            >
              Save Now
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// components/account-menu.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  Shield,
  History,
  Settings,
  ChevronDown,
} from "lucide-react";
import { userService } from "@/lib/user-service";

interface AccountMenuProps {
  onSaveAccount: () => void;
  onSignIn: () => void;
  onShowHistory: () => void;
  className?: string;
}

export function AccountMenu({
  onSaveAccount,
  onSignIn,
  onShowHistory,
  className,
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUserStatus();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const checkUserStatus = async () => {
    try {
      const user = await userService.getCurrentUser();
      const anonymous = userService.isAnonymous();

      setIsAnonymous(anonymous);
      setUserEmail(user?.email || null);
    } catch (error) {
      console.error("Failed to check user status:", error);
    }
  };

  const handleSignOut = async () => {
    if (
      !confirm(
        "Are you sure you want to sign out? Make sure you've saved your account if you want to keep your credits."
      )
    ) {
      return;
    }

    try {
      setSigningOut(true);
      await userService.signOut();

      // Reload page to reset state
      window.location.reload();
    } catch (error) {
      console.error("Failed to sign out:", error);
      alert("Failed to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Account Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="border-gray-300 flex items-center gap-2"
      >
        <User className="w-4 h-4" />
        {isAnonymous && (
          <span className="hidden sm:inline text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
            Guest
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">
                {isAnonymous ? "Guest User" : userEmail || "Signed In"}
              </span>
            </div>
            {isAnonymous && (
              <p className="text-xs text-gray-500 mt-1">
                Save your account to protect your credits
              </p>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* History */}
            <button
              onClick={() => {
                onShowHistory();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              View History
            </button>

            {/* Save Account (only for anonymous users) */}
            {isAnonymous && (
              <button
                onClick={() => {
                  onSaveAccount();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 font-medium"
              >
                <Shield className="w-4 h-4" />
                Save Account
              </button>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200 my-2" />

            {/* Sign Out / Sign In */}
            {isAnonymous ? (
              <button
                onClick={() => {
                  onSignIn();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign In
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            )}
          </div>

          {/* Footer */}
          {isAnonymous && (
            <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-100 rounded-b-lg">
              <p className="text-xs text-yellow-800">
                💡 Tip: Save your account before signing out to keep your
                credits!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

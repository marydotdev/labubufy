// components/mobile-menu.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  HelpCircle,
  History,
  Shield,
  LogIn,
  LogOut,
  User,
  CreditCard,
} from "lucide-react";
import { useUserStore } from "@/lib/stores/user-store";

interface MobileMenuProps {
  onSaveAccount: () => void;
  onSignIn: () => void;
  onShowHistory: () => void;
  onShowHelp: () => void;
  onBuyCredits: () => void;
  userCredits: number;
}

export function MobileMenu({
  onSaveAccount,
  onSignIn,
  onShowHistory,
  onShowHelp,
  onBuyCredits,
  userCredits,
}: MobileMenuProps) {
  const { user, signOut } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Derived state
  const isAnonymous = user?.is_anonymous ?? true;
  const userEmail = user?.email || null;

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

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
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error("Failed to sign out:", error);
      alert("Failed to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
    variant = "default",
    badge,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    variant?: "default" | "primary" | "danger";
    badge?: string;
  }) => {
    const variantStyles = {
      default: "text-gray-700 hover:bg-gray-50",
      primary: "text-violet-600 hover:bg-violet-50 font-medium",
      danger: "text-red-600 hover:bg-red-50",
    };

    return (
      <button
        onClick={() => {
          onClick();
          setIsOpen(false);
        }}
        className={`w-full px-6 py-4 text-left flex items-center gap-3 border-b border-gray-100 transition-colors ${variantStyles[variant]}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1">{label}</span>
        {badge && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Menu Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="sm:hidden"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 sm:hidden">
          {/* Menu Panel */}
          <div className="absolute inset-y-0 right-0 w-80 max-w-full bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Menu</h2>
                {isAnonymous && (
                  <p className="text-xs text-gray-500 mt-1">
                    Signed in as Guest
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* User Info Card */}
            <div className="px-6 py-4 bg-violet-50 border-b border-violet-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-violet-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-violet-700" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {isAnonymous ? "Guest User" : userEmail || "Signed In"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {userCredits} credit{userCredits !== 1 ? "s" : ""} available
                  </p>
                </div>
              </div>
              {isAnonymous && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
                  <p className="text-xs text-yellow-800">
                    💡 Save your account to protect your credits!
                  </p>
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto">
              <MenuItem
                icon={CreditCard}
                label="Buy Credits"
                onClick={onBuyCredits}
                variant="primary"
              />

              <MenuItem
                icon={History}
                label="Photo History"
                onClick={onShowHistory}
              />

              {isAnonymous && (
                <MenuItem
                  icon={Shield}
                  label="Save Account"
                  onClick={onSaveAccount}
                  variant="primary"
                  badge="Recommended"
                />
              )}

              <MenuItem
                icon={HelpCircle}
                label="Help & FAQ"
                onClick={onShowHelp}
              />

              {/* Divider */}
              <div className="h-2 bg-gray-50" />

              {isAnonymous ? (
                <MenuItem icon={LogIn} label="Sign In" onClick={onSignIn} />
              ) : (
                <MenuItem
                  icon={LogOut}
                  label={signingOut ? "Signing out..." : "Sign Out"}
                  onClick={handleSignOut}
                  variant="danger"
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 text-center">
                Made with 💜 for Labubu fans
              </p>
              <p className="text-xs text-gray-500 text-center mt-1">
                v1.0.0 • {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

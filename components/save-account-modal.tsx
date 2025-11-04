// components/save-account-modal.tsx - IMPROVED VERSION
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Mail, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { userService } from "@/lib/user-service";
import { supabase } from "@/lib/supabase";

interface SaveAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SaveAccountModal({
  isOpen,
  onClose,
  onSuccess,
}: SaveAccountModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    try {
      setLoading(true);

      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // IMPROVED: Use Supabase auth directly for better error handling
      const { data: authData, error: authError } =
        await supabase.auth.updateUser({
          email: normalizedEmail,
          password: password,
        });

      if (authError) {
        console.error("Auth update error:", authError);

        // Handle specific error cases
        if (
          authError.message.includes("already registered") ||
          authError.message.includes("already been registered")
        ) {
          setError(
            "This email is already in use. Please sign in with that email instead, or use a different email."
          );
          return;
        } else if (authError.message.includes("Invalid")) {
          setError("Please check your email format and try again.");
          return;
        } else {
          setError(authError.message);
          return;
        }
      }

      if (!authData.user) {
        setError("Failed to update account. Please try again.");
        return;
      }

      console.log("Auth updated successfully:", authData.user.id);

      // Now update the user_credits table
      const { error: updateError } = await supabase
        .from("user_credits")
        .update({
          email: normalizedEmail,
          is_anonymous: false,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_user_id", authData.user.id);

      if (updateError) {
        console.error("Failed to update user credits:", updateError);
        // Don't fail the whole process for this
      }

      // Also sync with our user service
      try {
        await userService.linkEmail(normalizedEmail, password);
      } catch (syncError) {
        console.error("User service sync error:", syncError);
        // Don't fail - the important part (Supabase auth) is done
      }

      setSuccess(true);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Failed to link email:", err);

      if (err instanceof Error) {
        if (
          err.message.includes("already registered") ||
          err.message.includes("already in use")
        ) {
          setError(
            "This email is already registered. Would you like to sign in instead?"
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to save account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Account Saved!
          </h2>
          <p className="text-gray-600">
            Your credits are now linked to your email. You can sign in from any
            device!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Save Your Account</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">
                Protect your credits!
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Save your account so you can access your credits from any
                device. Without this, your credits only work on this browser.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="your@email.com"
              required
              disabled={loading}
              autoComplete="email"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use an email you can access to recover your account
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="w-4 h-4 inline mr-1" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="At least 6 characters"
              minLength={6}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Re-enter password"
              minLength={6}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3"
          >
            {loading ? "Saving..." : "Save My Account"}
          </Button>
        </form>

        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> Your credits will be securely linked to this
            email address. You&apos;ll be able to sign in from any device to access
            your account.
          </p>
        </div>
      </div>
    </div>
  );
}

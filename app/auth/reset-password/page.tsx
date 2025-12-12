// app/auth/reset-password/page.tsx - NEW FILE
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setIsValidLink(true);
      } else {
        setIsValidLink(false);
      }
    };

    checkSession();

    // Listen for auth state changes from the email link
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidLink(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    try {
      setLoading(true);

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess(true);

      // Redirect to home page after 3 seconds
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err) {
      console.error("Password update error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update password"
      );
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking link validity
  if (isValidLink === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired link
  if (isValidLink === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Reset Link
          </h1>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired. Please request a
            new one.
          </p>
          <Link href="/">
            <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Password Updated!
          </h1>
          <p className="text-gray-600 mb-6">
            Your password has been successfully updated. You will be redirected
            to the home page...
          </p>
          <Link href="/">
            <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white">
              Go to Home Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Reset Your Password
          </h1>
          <p className="text-gray-600">Enter your new password below</p>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Re-enter your new password"
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
            {loading ? "Updating Password..." : "Update Password"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Remember your password?{" "}
            <Link
              href="/"
              className="text-violet-600 hover:text-violet-700 underline"
            >
              Go back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

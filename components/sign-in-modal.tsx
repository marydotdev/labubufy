// components/sign-in-modal.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Mail, Lock } from "lucide-react";
import { useUserStore } from "@/lib/stores/user-store";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SignInModal({ isOpen, onClose, onSuccess }: SignInModalProps) {
  const { signInWithEmail, signUpWithEmail } = useUserStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`🔐 Attempting to ${isSignUp ? 'sign up' : 'sign in'}...`);

      if (isSignUp) {
        try {
          await signUpWithEmail(email, password);
          console.log(`✅ Sign up successful!`);

          // Small delay to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 100));

          onSuccess();
          onClose();
        } catch (err) {
          // Handle email confirmation requirement
          if (err instanceof Error && err.message.includes('EMAIL_CONFIRMATION_REQUIRED')) {
            setError('Account created! Please check your email to confirm your account, then sign in.');
            // Don't close modal - let them try signing in after confirming
            return;
          }
          throw err; // Re-throw other errors
        }
      } else {
        await signInWithEmail(email, password);
        console.log(`✅ Sign in successful!`);

        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));

        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(`❌ Failed to ${isSignUp ? 'sign up' : 'sign in'}:`, err);
      const errorMessage = err instanceof Error
        ? err.message
        : `Failed to ${isSignUp ? 'sign up' : 'sign in'}. Please try again.`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isSignUp ? "Sign Up" : "Sign In"}
          </h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
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
            />
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
              placeholder="Your password"
              required
              disabled={loading}
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
            {loading
              ? isSignUp
                ? "Creating account..."
                : "Signing in..."
              : isSignUp
              ? "Sign Up"
              : "Sign In"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-sm text-violet-600 hover:text-violet-700 underline"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

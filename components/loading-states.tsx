"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Add custom CSS for animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .animate-fade-in {
      animation: fadeIn 0.5s ease-in-out;
    }
    .animation-delay-300 {
      animation-delay: 300ms;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// Loading skeleton for Labubu grid
export function LabubuGridSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-2 gap-3 sm:gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}

// Loading skeleton for image upload area
export function ImageUploadSkeleton() {
  return (
    <div className="flex flex-col items-center">
      <Skeleton className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg mb-4" />
      <Skeleton className="w-32 h-10 rounded-lg" />
    </div>
  );
}

// Loading skeleton for history gallery
export function HistoryGallerySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// Generation progress indicator
interface GenerationProgressProps {
  progress?: number;
  estimatedTime?: number;
  status?: string;
  onCancel?: () => void;
  className?: string;
}

export function GenerationProgress({
  progress = 0,
  estimatedTime = 0,
  status = "",
  onCancel,
  className,
}: GenerationProgressProps) {
  // Array of encouraging messages that rotate
  const messages = [
    "🎨 AI is painting your perfect Labubu moment...",
    "✨ Adding magical touches to your photo...",
    "🌟 Creating something amazing just for you...",
    "🎭 Your Labubu is getting ready to pose...",
    "💫 Almost there...",
  ];

  // Rotate message every 3 seconds
  const [currentMessage, setCurrentMessage] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Fun facts about Labubu to show while waiting
  // const funFacts = [
  //   "💡 Labubu was created by Hong Kong artist Kasing Lung in 2015",
  //   "🦷 Those signature teeth were inspired by Nordic folklore",
  //   "🌍 Labubu has fans all around the world!",
  //   "🎨 Each Labubu has its own unique personality",
  //   "⭐ You're about to create a one-of-a-kind Labubu memory!",
  // ];

  // const [currentFact, setCurrentFact] = React.useState(0);
  // React.useEffect(() => {
  //   const interval = setInterval(() => {
  //     setCurrentFact((prev) => (prev + 1) % funFacts.length);
  //   }, 4000);
  //   return () => clearInterval(interval);
  // }, [funFacts.length]);

  return (
    <div
      className={cn("flex flex-col items-center justify-center p-8", className)}
    >
      {/* Animated sparkles with bouncing effect */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 flex items-center justify-center animate-pulse">
          <Sparkles className="w-8 h-8 text-white animate-bounce" />
        </div>

        {/* Multiple spinning rings for more visual interest */}
        <div className="absolute inset-0 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
        <div className="absolute inset-1 rounded-full border-2 border-pink-200 border-r-pink-400 animate-spin animation-delay-300" style={{animationDirection: 'reverse'}} />
      </div>

      {/* Progress text with rotating messages */}
      <div className="text-center space-y-3 max-w-sm">
        <h3 className="text-lg font-semibold text-gray-900 animate-fade-in">
          {messages[currentMessage]}
        </h3>

        {/* Time remaining with more encouraging language */}
        <p className="text-sm text-gray-600">
          {status === "starting" && "🚀 Getting everything ready..."}
          {status === "processing" && estimatedTime > 0 && (
            estimatedTime > 30 ? "⏳ This is worth the wait!" :
            estimatedTime > 15 ? "🎯 Almost done!" :
            "🎉 Just a few more seconds!"
          )}
          {status === "processing" && estimatedTime === 0 && "🔮 Working some AI magic..."}
          {!status && "💝 Great things take a little time!"}
        </p>

        {/* Enhanced progress bar with glow effect */}
        <div className="w-64 mx-auto h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 transition-all duration-700 ease-out shadow-lg"
            style={{
              width: `${Math.min(progress, 100)}%`,
              boxShadow: progress > 10 ? '0 0 10px rgba(168, 85, 247, 0.5)' : 'none'
            }}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-500 font-medium">
            {progress > 0
              ? `${Math.round(progress)}% complete`
              : "🎬 Starting..."}
          </p>

          {/* Fun fact display */}
          {/* <p className="text-xs text-purple-600 italic animate-fade-in min-h-[1rem]">
            {funFacts[currentFact]}
          </p> */}
        </div>

        {/* Cancel button with better styling */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-6 px-6 py-2 text-sm text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300 rounded-full transition-all duration-200 hover:scale-105"
          >
            ❌ Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// Simple spinner component
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  );
}

// Loading overlay for the entire app
interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  progress?: number;
}

export function LoadingOverlay({
  show,
  message = "Loading...",
  progress,
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="lg" />
          <div className="text-center">
            <p className="font-medium text-gray-900">{message}</p>
            {progress !== undefined && (
              <div className="mt-3 w-full flex">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(progress)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className
      )}
    >
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 max-w-sm">{description}</p>
      {action}
    </div>
  );
}

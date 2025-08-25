"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <div
      className={cn("flex flex-col items-center justify-center p-8", className)}
    >
      {/* Animated sparkles */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
        </div>

        {/* Spinning ring */}
        <div className="absolute inset-0 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
      </div>

      {/* Progress text */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Creating your Labubu photo...
        </h3>
        <p className="text-sm text-gray-600">
          {status === "starting" && "Getting ready..."}
          {status === "processing" &&
            estimatedTime > 0 &&
            `About ${estimatedTime} seconds remaining`}
          {status === "processing" &&
            estimatedTime === 0 &&
            "Processing your image..."}
          {!status && "This might take up to 30 seconds"}
        </p>

        {/* Progress bar */}
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <p className="text-xs text-gray-500">
          {progress > 0
            ? `${Math.round(progress)}% complete`
            : "Initializing..."}
        </p>

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
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
              <div className="mt-3 w-full">
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

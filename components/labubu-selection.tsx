"use client";

import React from "react";
import { LABUBU_OPTIONS, type LabubuOption } from "@/lib/config";
import { cn } from "@/lib/utils";

interface LabubuSelectionProps {
  selectedLabubu: number | null;
  onSelect: (id: number) => void;
  className?: string;
}

export function LabubuSelection({ selectedLabubu, onSelect, className }: LabubuSelectionProps) {
  return (
    <div className={cn("grid grid-cols-3 sm:grid-cols-2 gap-3 sm:gap-4", className)}>
      {LABUBU_OPTIONS.map((labubu) => (
        <LabubuCard
          key={labubu.id}
          labubu={labubu}
          isSelected={selectedLabubu === labubu.id}
          onSelect={() => onSelect(labubu.id)}
        />
      ))}
    </div>
  );
}

interface LabubuCardProps {
  labubu: LabubuOption;
  isSelected: boolean;
  onSelect: () => void;
}

function LabubuCard({ labubu, isSelected, onSelect }: LabubuCardProps) {
  return (
    <div
      className={cn(
        "group relative aspect-square rounded-lg cursor-pointer transition-all duration-200",
        "hover:scale-105 hover:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
        labubu.color,
        isSelected
          ? "ring-4 ring-black scale-105 shadow-lg"
          : "ring-2 ring-transparent hover:ring-black/20"
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select ${labubu.name} Labubu`}
    >
      {/* Background pattern for visual interest */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg" />
      
      {/* Labubu image */}
      <div className="relative w-full h-full flex items-center justify-center p-2">
        <img
          src={labubu.image || "/placeholder.svg"}
          alt={labubu.name}
          className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-sm transition-transform group-hover:scale-110"
        />
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      {/* Hover overlay with name */}
      <div className="absolute inset-x-0 bottom-0 bg-black/80 text-white text-xs text-center py-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
        {labubu.name}
      </div>
    </div>
  );
}
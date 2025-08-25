"use client";

import React, { useState } from "react";
import { LABUBU_DOLLS, LABUBU_KEYCHAINS, type LabubuOption } from "@/lib/config";
import { cn } from "@/lib/utils";

interface LabubuSelectionProps {
  selectedLabubu: number | null;
  onSelect: (id: number) => void;
  className?: string;
}

type TabType = "dolls" | "keychains";

export function LabubuSelection({
  selectedLabubu,
  onSelect,
  className,
}: LabubuSelectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("dolls");

  const currentOptions = activeTab === "dolls" ? LABUBU_DOLLS : LABUBU_KEYCHAINS;

  return (
    <div className={cn("w-full", className)}>
      {/* Drawer-like tabs */}
      <div className="mb-4">
        <div className="flex border border-black rounded-lg p-1 max-w-sm mx-auto mb-2 bg-white">
          <button
            onClick={() => setActiveTab("dolls")}
            className={cn(
              "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
              activeTab === "dolls"
                ? "bg-purple-500 text-white shadow-sm"
                : "text-black hover:bg-purple-50"
            )}
            aria-pressed={activeTab === "dolls"}
          >
            Dolls
          </button>
          <button
            onClick={() => setActiveTab("keychains")}
            className={cn(
              "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
              activeTab === "keychains"
                ? "bg-purple-500 text-white shadow-sm"
                : "text-black hover:bg-purple-50"
            )}
            aria-pressed={activeTab === "keychains"}
          >
            Keychains
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="grid grid-cols-3 sm:grid-cols-2 gap-3 sm:gap-4">
        {currentOptions.map((labubu) => (
          <LabubuCard
            key={labubu.id}
            labubu={labubu}
            isSelected={selectedLabubu === labubu.id}
            onSelect={() => onSelect(labubu.id)}
          />
        ))}
      </div>
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
        "group relative aspect-square rounded-lg cursor-pointer transition-all duration-200 bg-white",
        "hover:scale-105 hover:shadow-lg border-2",
        "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",

        isSelected
          ? "border-purple-500 scale-105 shadow-lg"
          : "border-black hover:border-purple-300"
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select ${labubu.name} Labubu`}
    >
      {/* Labubu image */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={labubu.image}
          alt={labubu.name}
          className="w-full h-full object-contain drop-shadow-sm  rounded-lg"
        />
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
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
      {/* <div className="absolute inset-x-0 bottom-0 bg-black/80 text-white text-xs text-center py-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
        {labubu.name}
      </div> */}
    </div>
  );
}

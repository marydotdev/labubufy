"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GenerationProgress } from "@/components/loading-states";

interface TestPhoto {
  id: string;
  originalImage: string;
  name: string;
}

interface TestPhotosProps {
  onTestPhotoSelect: (originalImage: string) => void;
  className?: string;
}

const testPhotos: TestPhoto[] = [
  {
    id: "test-1",
    originalImage: "/test-photos/original1.svg",
    name: "Portrait Test",
  },
  {
    id: "test-2",
    originalImage: "/test-photos/original2.svg",
    name: "Selfie Test",
  },
  {
    id: "test-3",
    originalImage: "/test-photos/original3.svg",
    name: "Group Photo Test",
  },
  {
    id: "test-4",
    originalImage: "/test-photos/original4.svg",
    name: "Casual Test",
  },
];

export function TestPhotos({ onTestPhotoSelect, className }: TestPhotosProps) {
  const handleTestPhotoClick = (photo: TestPhoto) => {
    onTestPhotoSelect(photo.originalImage);
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
          or test it out with one of these photos
        </h3>
        <p className="text-sm text-gray-600 text-center">
          Click any photo below to upload it, then select a Labubu
        </p>
      </div>

      <div className="bg-blue-100 rounded-lg p-4">
        <div className="gap-2 md:gap-y-8 lg:gap-4 grid grid-cols-4 sm:grid-cols-2 lg:grid-cols-4 place-items-center">
          {testPhotos.map((photo) => (
            <div
              key={photo.id}
              className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-200 hover:border-violet-400 transition-all duration-200 hover:shadow-lg"
              onClick={() => handleTestPhotoClick(photo)}
            >
              <div className="w-24 h-24 relative">
                <img
                  src={photo.originalImage}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to a placeholder if image doesn't exist
                    e.currentTarget.src =
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==";
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-white bg-opacity-90 rounded-full p-1">
                      <svg
                        className="w-4 h-4 text-violet-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { fileValidator, errorHandler } from "@/lib/errors";
import { imageUtils } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageUpload: (file: File, previewUrl: string) => void;
  onError: (error: string) => void;
  className?: string;
}

export function ImageUpload({
  onImageUpload,
  onError,
  className,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    try {
      // Validate file
      fileValidator.validateFile(file);
      await fileValidator.validateImageDimensions(file);

      // Optimize image for processing
      const { file: optimizedFile } = await imageUtils.optimizeForProcessing(file);

      const previewUrl = await imageUtils.fileToBase64(optimizedFile);
      onImageUpload(optimizedFile, previewUrl);
    } catch (err) {
      const appError = errorHandler.parseError(err);
      onError(errorHandler.getUserMessage(appError));
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processFile(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        await processFile(file);
      } else {
        onError("Please drop an image file");
      }
    }
  };

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center",
        className
      )}
    >
      {/* Upload area */}
      <div
        className="mx-auto w-48 h-48 sm:w-56 sm:h-56 bg-gray-200 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-400 hover:border-gray-500 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-purple-dark mb-3 sm:mb-4" />
        <p className="hidden sm:block text-black text-sm sm:text-base text-center px-4">
          Drop image here or click to upload
        </p>
        <p className="hidden sm:block text-gray-600 text-xs mt-1">JPG, PNG, WebP up to 100MB</p>
      </div>

      {/* Action buttons */}
      <div className="hidden sm:flex gap-3 mt-4 justify-center">
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="bg-purple-dark hover:bg-purple-light text-white text-sm sm:text-base px-6 py-3"
        >
          <Upload className="h-4 w-4 mr-2" />
          Choose Photo
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

interface ImagePreviewProps {
  imageUrl: string;
  onRemove?: () => void;
  className?: string;
}

export function ImagePreview({ imageUrl, className }: ImagePreviewProps) {
  return (
    <div className={cn("relative text-center", className)}>
      <img
        src={imageUrl}
        alt="Uploaded preview"
        className="max-w-full max-h-[50vh] sm:max-h-[55vh] md:max-h-[60vh] object-contain rounded-lg shadow-lg"
      />
    </div>
  );
}

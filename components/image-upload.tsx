"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Camera, X, RotateCcw } from "lucide-react";
import { fileValidator, errorHandler } from "@/lib/errors";
import { imageUtils, deviceUtils } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageUpload: (file: File, previewUrl: string) => void;
  onError: (error: string) => void;
  className?: string;
}

export function ImageUpload({ onImageUpload, onError, className }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file
      fileValidator.validateFile(file);
      await fileValidator.validateImageDimensions(file);

      // Optimize image for processing
      const { file: optimizedFile } = await imageUtils.optimizeForProcessing(file);

      // Convert to preview
      const previewUrl = await imageUtils.fileToBase64(optimizedFile);
      onImageUpload(optimizedFile, previewUrl);

    } catch (err) {
      const appError = errorHandler.parseError(err);
      onError(errorHandler.getUserMessage(appError));
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        try {
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
      } else {
        onError('Please drop an image file');
      }
    }
  };

  const startCamera = async () => {
    if (!deviceUtils.supportsCamera()) {
      onError('Camera not supported on this device');
      return;
    }

    setIsCameraLoading(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setStream(mediaStream);
      setShowCamera(true);
    } catch {
      onError('Unable to access camera. Please check permissions.');
    } finally {
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        // Create file from blob
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });

        // Validate dimensions
        await fileValidator.validateImageDimensions(file);

        // Optimize image for processing
        const { file: optimizedFile } = await imageUtils.optimizeForProcessing(file);

        const previewUrl = await imageUtils.fileToBase64(optimizedFile);
        onImageUpload(optimizedFile, previewUrl);
        stopCamera();

      } catch (err) {
        const appError = errorHandler.parseError(err);
        onError(errorHandler.getUserMessage(appError));
      }
    }, 'image/jpeg', 0.85);
  };

  const flipCamera = async () => {
    stopCamera();
    // Small delay to ensure camera is fully stopped
    setTimeout(async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: stream?.getVideoTracks()[0]?.getSettings().facingMode === 'user' ? 'environment' : 'user',
            width: { ideal: 1080 },
            height: { ideal: 1080 }
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        setStream(mediaStream);
      } catch {
        onError('Unable to switch camera');
      }
    }, 100);
  };

  if (showCamera) {
    return (
      <div className={cn("relative w-full h-full", className)}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover rounded-lg"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera controls */}
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={stopCamera}
            className="bg-black/50 border-white/20 text-white hover:bg-black/70"
          >
            <X className="h-4 w-4" />
          </Button>

          <Button
            onClick={capturePhoto}
            className="w-16 h-16 rounded-full bg-white/90 hover:bg-white border-4 border-white/50"
          >
            <div className="w-12 h-12 rounded-full bg-white" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={flipCamera}
            className="bg-black/50 border-white/20 text-white hover:bg-black/70"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full flex flex-col items-center justify-center", className)}>
      {/* Upload area */}
      <div
        className="mx-auto w-48 h-48 sm:w-56 sm:h-56 bg-gray-200 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-400 hover:border-gray-500 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-purple-dark mb-3 sm:mb-4" />
        <p className="text-black text-sm sm:text-base text-center px-4">
          Drop image here or click to upload
        </p>
        <p className="text-gray-600 text-xs mt-1">
          JPG, PNG, WebP up to 100MB
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-4 justify-center">
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="bg-purple-dark hover:bg-purple-light text-white text-sm sm:text-base px-6 py-3"
        >
          <Upload className="h-4 w-4 mr-2" />
          Choose Photo
        </Button>

        {deviceUtils.isMobile() && deviceUtils.supportsCamera() && (
          <Button
            variant="outline"
            onClick={startCamera}
            disabled={isCameraLoading}
            className="border-black text-black hover:bg-purple-50 text-sm sm:text-base px-6 py-3"
          >
            <Camera className="h-4 w-4 mr-2" />
            {isCameraLoading ? 'Loading...' : 'Camera'}
          </Button>
        )}
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
  onRemove: () => void;
  className?: string;
}

export function ImagePreview({ imageUrl, onRemove, className }: ImagePreviewProps) {
  return (
    <div className={cn("relative text-center", className)}>
      <img
        src={imageUrl}
        alt="Uploaded preview"
        className="max-w-full max-h-[50vh] sm:max-h-[55vh] md:max-h-[60vh] object-contain rounded-lg shadow-lg"
      />
      <Button
        variant="outline"
        onClick={onRemove}
        className="mt-4 bg-white"
      >
        Choose Different Photo
      </Button>
    </div>
  );
}

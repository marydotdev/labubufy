"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, Share2, History } from "lucide-react";
import { LABUBU_OPTIONS } from "@/lib/config";
import { fileValidator, errorHandler, AppError } from "@/lib/errors";
import { imageUtils, formatUtils, deviceUtils, urlUtils } from "@/lib/utils";
import { imageStorage } from "@/lib/storage";

export default function LabubufyApp() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedLabubu, setSelectedLabubu] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      
      // Validate file
      fileValidator.validateFile(file);
      await fileValidator.validateImageDimensions(file);

      // Convert to preview
      const previewUrl = await imageUtils.fileToBase64(file);
      setUploadedImage(previewUrl);
      setUploadedFile(file);
      
    } catch (err) {
      const appError = errorHandler.parseError(err);
      setError(appError);
      errorHandler.logError(appError, { action: 'file_upload' });
    }
  };

  const handleGenerate = async () => {
    if (!uploadedFile || selectedLabubu === null) return;

    try {
      setError(null);
      setIsGenerating(true);

      // Convert file to base64 for API
      const imageBase64 = await imageUtils.fileToBase64(uploadedFile);

      // Call generation API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          labubu_id: selectedLabubu,
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // For now, simulate the result since we don't have real API keys
      // In production, this would poll the status endpoint
      setTimeout(async () => {
        try {
          // Simulate a generated image URL
          const mockImageUrl = "/magical-labubu-photo.png";
          setGeneratedImage(mockImageUrl);

          // Create mock blob for download
          const mockBlob = new Blob([uploadedFile], { type: 'image/jpeg' });
          setGeneratedBlob(mockBlob);

          // Save to history
          await imageStorage.saveImage(uploadedFile, mockBlob, selectedLabubu);
          
          setIsGenerating(false);
        } catch (err) {
          const appError = errorHandler.parseError(err);
          setError(appError);
          setIsGenerating(false);
        }
      }, 3000);

    } catch (err) {
      const appError = errorHandler.parseError(err);
      setError(appError);
      setIsGenerating(false);
      errorHandler.logError(appError, { action: 'image_generation', labubu_id: selectedLabubu });
    }
  };

  const handleDownload = () => {
    if (!generatedBlob || selectedLabubu === null) return;
    
    const filename = formatUtils.generateFilename(selectedLabubu);
    urlUtils.downloadBlob(generatedBlob, filename);
  };

  const handleShare = async () => {
    if (!generatedBlob) return;

    try {
      if (deviceUtils.supportsWebShare()) {
        await navigator.share({
          title: 'My Labubu Photo',
          text: 'Check out my awesome Labubu photo!',
          files: [new File([generatedBlob], 'labubu-photo.jpg', { type: 'image/jpeg' })]
        });
      } else {
        // Fallback to copying image to clipboard or showing share modal
        // For now, just download
        handleDownload();
      }
    } catch {
      // User cancelled share or error occurred
      console.log('Share cancelled or failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-purple-600">Labubufy</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            History
          </Button>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{errorHandler.getUserMessage(error)}</p>
              {error.retryable && (
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-500"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
        <div className="max-w-6xl w-full border-2 border-red-200 bg-white rounded-lg overflow-hidden h-[80vh]">
          <div className="flex flex-col-reverse sm:flex-row h-full">
          {/* Left Panel - Labubu Selection */}
          <div className="w-full sm:w-1/2 p-4 sm:p-6 sm:border-r border-gray-200 flex flex-col">
            <div className="w-full h-fit max-w-sm mx-auto flex-1 flex flex-col justify-center">

              {/* Labubu Grid - 2x3 colorful rectangles */}
              <div className="grid grid-cols-3 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 flex-shrink-0">
                {LABUBU_OPTIONS.map((labubu) => (
                  <div
                    key={labubu.id}
                    className={`aspect-square ${
                      labubu.color
                    } rounded-lg cursor-pointer border-2 sm:border-3 transition-all ${
                      selectedLabubu === labubu.id
                        ? "border-black"
                        : "border-transparent"
                    }`}
                    onClick={() => setSelectedLabubu(labubu.id)}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={labubu.image || "/placeholder.svg"}
                        alt={labubu.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Purple buttons underneath */}
              <div className="space-y-3 sm:space-y-4 flex-shrink-0">
                <Button
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-4 sm:py-5 text-sm sm:text-base"
                  onClick={handleGenerate}
                  disabled={
                    !uploadedFile || selectedLabubu === null || isGenerating
                  }
                >
                  {isGenerating ? "Generating..." : "Generate Photo"}
                </Button>

                {generatedImage && (
                  <div className="flex gap-3 sm:gap-4">
                    <Button
                      variant="outline"
                      className="flex-1 border-purple-500 text-purple-500 hover:bg-purple-50 py-3 sm:py-4 bg-transparent text-sm"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-purple-500 text-purple-500 hover:bg-purple-50 py-3 sm:py-4 bg-transparent text-sm"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Upload/Result */}
          <div className="w-full sm:w-1/2 bg-gray-100 flex items-center justify-center p-4 sm:p-6">
            {generatedImage ? (
              <div className="text-center">
                <img
                  src={generatedImage || "/placeholder.svg"}
                  alt="Generated"
                  className="max-w-full max-h-[30vh] sm:max-h-[40vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            ) : uploadedImage ? (
              <div className="text-center space-y-4">
                <img
                  src={uploadedImage || "/placeholder.svg"}
                  alt="Uploaded"
                  className="max-w-full max-h-[30vh] sm:max-h-[40vh] object-contain rounded-lg shadow-lg"
                />
                <Button
                  variant="outline"
                  onClick={() => setUploadedImage(null)}
                  className="bg-white"
                >
                  Choose Different Photo
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-48 h-48 sm:w-56 sm:h-56 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400 mb-4">
                  <div className="text-center">
                    <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <p className="text-gray-500 text-sm sm:text-base">Upload your photo</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload">
                  <Button className="cursor-pointer bg-gray-800 hover:bg-gray-900 text-sm sm:text-base px-6 py-3">
                    Choose Photo
                  </Button>
                </label>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

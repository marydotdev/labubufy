"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, History } from "lucide-react";
import { LabubuSelection } from "@/components/labubu-selection";
import { ImageUpload, ImagePreview } from "@/components/image-upload";
import { GenerationProgress } from "@/components/loading-states";
import { HistoryGallery } from "@/components/history-gallery";
import { errorHandler } from "@/lib/errors";
import { imageUtils, formatUtils, deviceUtils, urlUtils } from "@/lib/utils";
import { imageStorage } from "@/lib/storage";

export default function LabubufyApp() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedLabubu, setSelectedLabubu] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleImageUpload = (file: File, previewUrl: string) => {
    setUploadedFile(file);
    setUploadedImage(previewUrl);
    setError(null);
  };

  const handleImageRemove = () => {
    setUploadedFile(null);
    setUploadedImage(null);
    setGeneratedImage(null);
    setGeneratedBlob(null);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleGenerate = async () => {
    if (!uploadedFile || selectedLabubu === null) return;

    try {
      setError(null);
      setIsGenerating(true);
      setGenerationProgress(0);

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

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      // For now, simulate the result since we don't have real API keys
      // In production, this would poll the status endpoint
      setTimeout(async () => {
        clearInterval(progressInterval);
        setGenerationProgress(100);
        
        try {
          // Simulate a generated image URL
          const mockImageUrl = "/magical-labubu-photo.png";
          setGeneratedImage(mockImageUrl);

          // Create mock blob for download
          const mockBlob = new Blob([uploadedFile], { type: 'image/jpeg' });
          setGeneratedBlob(mockBlob);

          // Save to history
          await imageStorage.saveImage(uploadedFile, mockBlob, selectedLabubu);
          
          setTimeout(() => {
            setIsGenerating(false);
            setGenerationProgress(0);
          }, 500);
        } catch (err) {
          const appError = errorHandler.parseError(err);
          setError(errorHandler.getUserMessage(appError));
          setIsGenerating(false);
          setGenerationProgress(0);
        }
      }, 3000);

    } catch (err) {
      const appError = errorHandler.parseError(err);
      setError(errorHandler.getUserMessage(appError));
      setIsGenerating(false);
      setGenerationProgress(0);
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
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 underline hover:text-red-500"
              >
                Dismiss
              </button>
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

              {/* Labubu Selection Grid */}
              <LabubuSelection
                selectedLabubu={selectedLabubu}
                onSelect={setSelectedLabubu}
                className="mb-6 flex-shrink-0"
              />

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
            {isGenerating ? (
              <GenerationProgress progress={generationProgress} />
            ) : generatedImage ? (
              <ImagePreview
                imageUrl={generatedImage}
                onRemove={handleImageRemove}
              />
            ) : uploadedImage ? (
              <ImagePreview
                imageUrl={uploadedImage}
                onRemove={handleImageRemove}
              />
            ) : (
              <ImageUpload
                onImageUpload={handleImageUpload}
                onError={handleUploadError}
              />
            )}
          </div>
          </div>
        </div>
      </div>

      {/* History Gallery Modal */}
      <HistoryGallery
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}

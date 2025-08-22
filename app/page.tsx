"use client";

import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, History } from "lucide-react";
import { LabubuSelection } from "@/components/labubu-selection";
import { ImageUpload, ImagePreview } from "@/components/image-upload";
import { GenerationProgress } from "@/components/loading-states";
import { HistoryGallery } from "@/components/history-gallery";
import { errorHandler } from "@/lib/errors";
import { imageUtils, formatUtils, urlUtils } from "@/lib/utils";
import { imageStorage } from "@/lib/storage";
import { generationService } from "@/lib/generation";
import { sharingService } from "@/lib/sharing";

export default function LabubufyApp() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedLabubu, setSelectedLabubu] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPredictionId, setCurrentPredictionId] = useState<string | null>(null);

  // Cleanup on component unmount
  React.useEffect(() => {
    return () => {
      if (currentPredictionId) {
        generationService.stopPolling(currentPredictionId);
      }
    };
  }, [currentPredictionId]);

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
      setEstimatedTime(0);
      setGenerationStatus('starting');

      // Convert file to base64 for API
      const imageBase64 = await imageUtils.fileToBase64(uploadedFile);

      // Use the generation service
      const result = await generationService.generateWithPolling(
        {
          image: imageBase64,
          labubu_id: selectedLabubu,
        },
        (progress, estimatedTime, status) => {
          setGenerationProgress(progress);
          setEstimatedTime(estimatedTime || 0);
          setGenerationStatus(status || 'processing');
        }
      );

      // Generation completed successfully
      setGeneratedImage(result.imageUrl);
      setGeneratedBlob(result.blob);

      // Save to history
      await imageStorage.saveImage(uploadedFile, result.blob, selectedLabubu);

      // Reset generation state
      setIsGenerating(false);
      setGenerationProgress(0);
      setEstimatedTime(0);
      setGenerationStatus('');
      setCurrentPredictionId(null);

    } catch (err) {
      const appError = errorHandler.parseError(err);
      setError(errorHandler.getUserMessage(appError));
      setIsGenerating(false);
      setGenerationProgress(0);
      setEstimatedTime(0);
      setGenerationStatus('');
      setCurrentPredictionId(null);
      errorHandler.logError(appError, { action: 'image_generation', labubu_id: selectedLabubu });
    }
  };

  // Cancel generation
  const handleCancelGeneration = () => {
    if (currentPredictionId) {
      generationService.stopPolling(currentPredictionId);
    }
    setIsGenerating(false);
    setGenerationProgress(0);
    setEstimatedTime(0);
    setGenerationStatus('');
    setCurrentPredictionId(null);
  };

  const handleDownload = () => {
    if (!generatedBlob || selectedLabubu === null) return;

    const filename = formatUtils.generateFilename(selectedLabubu);
    urlUtils.downloadBlob(generatedBlob, filename);
  };

  const handleShare = async () => {
    if (!generatedBlob || selectedLabubu === null) return;

    try {
      const filename = sharingService.generateShareFilename(selectedLabubu);
      const result = await sharingService.shareImage(generatedBlob, filename, {
        title: 'My Labubu Photo',
        text: 'Check out my awesome Labubu photo created with Labubufy!'
      });

      if (!result.success && result.error) {
        console.log('Share failed:', result.error);
      }
    } catch (error) {
      console.error('Share error:', error);
      // Fallback to download
      handleDownload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="font-zubilo text-xl sm:text-2xl font-bold text-purple-600">Labubufy</h1>
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
              <GenerationProgress
                progress={generationProgress}
                estimatedTime={estimatedTime}
                status={generationStatus}
                onCancel={handleCancelGeneration}
              />
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

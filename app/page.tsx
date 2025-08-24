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
import { sharingService } from "@/lib/sharing";

interface GenerationRequest {
  image: string;
  labubu_id: number;
}

interface StatusResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  progress: number;
  estimated_time: number;
  step?: number;
  total_steps?: number;
}

export default function LabubufyApp() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedLabubu, setSelectedLabubu] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPredictionId, setCurrentPredictionId] = useState<string | null>(
    null
  );

  // Cleanup on component unmount
  React.useEffect(() => {
    return () => {
      if (currentPredictionId) {
        stopPolling(currentPredictionId);
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

  // Polling state
  let pollingInterval: NodeJS.Timeout | null = null;

  const stopPolling = (predictionId: string) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    console.log(`🛑 Stopped polling for prediction: ${predictionId}`);
  };

  const startPolling = (predictionId: string) => {
    console.log(`🚀 Starting polling for prediction: ${predictionId}`);

    const checkStatus = async () => {
      try {
        console.log(`📡 Checking status for prediction: ${predictionId}`);
        const response = await fetch(`/api/status/${predictionId}`);

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const status: StatusResponse = await response.json();
        console.log(`📊 Raw status response:`, JSON.stringify(status, null, 2));

        // Update progress
        setGenerationProgress(status.progress);
        setEstimatedTime(status.estimated_time || 0);

        // Update status message based on step
        if (status.step === 1) {
          setGenerationStatus("Merging images...");
          console.log(
            `🔄 Step 1: Merging images... Progress: ${status.progress}%`
          );
        } else if (status.step === 2) {
          setGenerationStatus("Creating final image...");
          console.log(
            `🔄 Step 2: Creating final image... Progress: ${status.progress}%`
          );
        } else {
          setGenerationStatus(status.status || "processing");
          console.log(
            `🔄 Status: ${status.status}, Progress: ${status.progress}%`
          );
        }

        // CRITICAL: Only handle completion when status is 'succeeded'
        if (status.status === "succeeded") {
          console.log(`✅ Generation completed successfully!`);
          console.log(`📸 Output received:`, status.output);

          const imageUrl = Array.isArray(status.output)
            ? status.output[0]
            : status.output;

          if (!imageUrl) {
            throw new Error("No image URL in completed result");
          }

          console.log(`🖼️ Final image URL: ${imageUrl}`);

          // Check if this is actually the final step 2 URL
          if (!imageUrl.includes("replicate.delivery")) {
            console.warn(
              `⚠️ Image URL doesn't look like a Replicate URL: ${imageUrl}`
            );
          }

          // Download the final image
          console.log(`📥 Downloading final image...`);
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(
              `Failed to download image: ${imageResponse.status}`
            );
          }

          const blob = await imageResponse.blob();
          console.log(`💾 Downloaded blob size: ${blob.size} bytes`);

          // Convert blob to data URL for display
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            console.log(
              `🎨 Setting generated image (data URL length: ${dataUrl.length})`
            );
            setGeneratedImage(dataUrl);
          };
          reader.readAsDataURL(blob);

          setGeneratedBlob(blob);

          // Save to history
          if (uploadedFile && selectedLabubu !== null) {
            console.log(`💾 Saving to history...`);
            await imageStorage.saveImage(uploadedFile, blob, selectedLabubu);
          }

          // Reset generation state
          console.log(`🏁 Resetting generation state`);
          setIsGenerating(false);
          setGenerationProgress(0);
          setEstimatedTime(0);
          setGenerationStatus("");
          setCurrentPredictionId(null);
          stopPolling(predictionId);
        } else if (status.status === "failed") {
          console.error(`❌ Generation failed:`, status.error);
          throw new Error(status.error || "Generation failed");
        } else if (
          status.status === "processing" ||
          status.status === "starting"
        ) {
          // Continue polling if still processing
          console.log(
            `⏳ Still processing... Step ${status.step}/${status.total_steps}, Progress: ${status.progress}%`
          );
          console.log(`⏰ Estimated time remaining: ${status.estimated_time}s`);
        } else {
          console.warn(`🤔 Unexpected status: ${status.status}`);
        }
      } catch (err) {
        console.error("❌ Polling error:", err);
        const appError = errorHandler.parseError(err);
        setError(errorHandler.getUserMessage(appError));
        setIsGenerating(false);
        setGenerationProgress(0);
        setEstimatedTime(0);
        setGenerationStatus("");
        setCurrentPredictionId(null);
        stopPolling(predictionId);
      }
    };

    // Start polling immediately, then every 2 seconds
    checkStatus();
    pollingInterval = setInterval(checkStatus, 2000);

    // Set timeout to prevent infinite polling
    setTimeout(() => {
      if (pollingInterval) {
        console.log(`⏰ Polling timeout reached for ${predictionId}`);
        stopPolling(predictionId);
        setError("Generation timeout - please try again");
        setIsGenerating(false);
        setGenerationProgress(0);
        setEstimatedTime(0);
        setGenerationStatus("");
        setCurrentPredictionId(null);
      }
    }, 120000); // 2 minutes
  };

  const handleGenerate = async () => {
    if (!uploadedFile || selectedLabubu === null) return;

    try {
      setError(null);
      setIsGenerating(true);
      setGenerationProgress(0);
      setEstimatedTime(0);
      setGenerationStatus("Starting...");

      console.log(`🎬 Starting generation for Labubu ${selectedLabubu}`);

      // Convert file to base64 for API
      const imageBase64 = await imageUtils.fileToBase64(uploadedFile);
      console.log(
        `📷 Image converted to base64 (length: ${imageBase64.length})`
      );

      // Start generation
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageBase64,
          labubu_id: selectedLabubu,
        } as GenerationRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Generation failed");
      }

      console.log(`✅ Generation started successfully:`, result);
      setCurrentPredictionId(result.prediction_id);

      // Start polling for status
      startPolling(result.prediction_id);
    } catch (err) {
      console.error("❌ Generation start error:", err);
      const appError = errorHandler.parseError(err);
      setError(errorHandler.getUserMessage(appError));
      setIsGenerating(false);
      setGenerationProgress(0);
      setEstimatedTime(0);
      setGenerationStatus("");
      setCurrentPredictionId(null);
    }
  };

  // Cancel generation
  const handleCancelGeneration = () => {
    console.log(`🛑 User cancelled generation`);
    if (currentPredictionId) {
      stopPolling(currentPredictionId);
    }
    setIsGenerating(false);
    setGenerationProgress(0);
    setEstimatedTime(0);
    setGenerationStatus("");
    setCurrentPredictionId(null);
  };

  const handleDownload = () => {
    if (!generatedBlob || selectedLabubu === null) return;

    console.log(`📥 Downloading image...`);
    const filename = formatUtils.generateFilename(selectedLabubu);
    urlUtils.downloadBlob(generatedBlob, filename);
  };

  const handleShare = async () => {
    if (!generatedBlob || selectedLabubu === null) return;

    try {
      console.log(`🔗 Sharing image...`);
      const filename = sharingService.generateShareFilename(selectedLabubu);
      const result = await sharingService.shareImage(generatedBlob, filename, {
        title: "My Labubu Photo",
        text: "Check out my awesome Labubu photo created with Labubufy!",
      });

      if (!result.success && result.error) {
        console.log("Share failed:", result.error);
      }
    } catch (error) {
      console.error("Share error:", error);
      // Fallback to download
      handleDownload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="font-zubilo text-xl sm:text-2xl font-bold text-purple-600">
            Labubufy
          </h1>
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

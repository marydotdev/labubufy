"use client";

import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Share2,
  History,
  MessageCircleQuestionMark,
  Rewind,
  RefreshCcw,
} from "lucide-react";
import { LabubuSelection } from "@/components/labubu-selection";
import { ImageUpload, ImagePreview } from "@/components/image-upload";
import { TestPhotos } from "@/components/test-photos";
import { GenerationProgress } from "@/components/loading-states";
import { HistoryGallery } from "@/components/history-gallery";
import { errorHandler } from "@/lib/errors";
import { imageUtils, formatUtils, urlUtils } from "@/lib/utils";
import { imageStorage } from "@/lib/storage";
import { sharingService } from "@/lib/sharing";
import Image from "next/image";
import Link from "next/link";

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
  const [isTestPhoto, setIsTestPhoto] = useState(false);

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
    setIsTestPhoto(false); // Reset test photo flag for real uploads
    setError(null);
  };

  const handleImageRemove = () => {
    setUploadedFile(null);
    setUploadedImage(null);
    setGeneratedImage(null);
    setGeneratedBlob(null);
    setSelectedLabubu(null);
    setIsTestPhoto(false);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleTestPhotoSelect = (originalImage: string) => {
    // Set the original image as uploaded (like a real upload)
    setUploadedImage(originalImage);

    // Clear any existing generated image
    setGeneratedImage(null);
    setGeneratedBlob(null);

    // Mark as test photo
    setIsTestPhoto(true);

    // Clear any errors
    setError(null);
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

        // Update status message for single-step generation with encouraging messages
        if (status.status === "starting") {
          setGenerationStatus("🚀 Getting ready to create magic...");
        } else if (status.status === "processing") {
          if (status.progress < 20) {
            setGenerationStatus("🎨 AI is analyzing your photo...");
          } else if (status.progress < 50) {
            setGenerationStatus("✨ Blending you with your Labubu...");
          } else if (status.progress < 80) {
            setGenerationStatus("🎭 Adding the finishing touches...");
          } else {
            setGenerationStatus("🌟 Almost ready to reveal your photo...");
          }
        } else {
          setGenerationStatus(status.status || "processing");
        }

        console.log(
          `🔄 Status: ${status.status}, Progress: ${status.progress}%`
        );

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
          console.log(`⏳ Still processing... Progress: ${status.progress}%`);
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
    }, 90000); // 1.5 minutes for single-step generation
  };

  const handleGenerate = async () => {
    if (!uploadedImage || selectedLabubu === null) return;

    try {
      setError(null);
      setIsGenerating(true);
      setGenerationProgress(0);
      setEstimatedTime(0);
      setGenerationStatus("🎬 Starting your Labubu transformation...");

      console.log(`🎬 Starting generation for Labubu ${selectedLabubu}`);

      // Check if this is a test photo
      if (isTestPhoto) {
        // For test photos, use pre-generated images
        console.log(
          `🎭 Using pre-generated test photo for Labubu ${selectedLabubu}`
        );

        // Determine which test photo is being used
        let testPhotoNumber = 1;
        if (uploadedImage.includes("original2")) testPhotoNumber = 2;
        else if (uploadedImage.includes("original3")) testPhotoNumber = 3;
        else if (uploadedImage.includes("original4")) testPhotoNumber = 4;

        // Simulate loading progress for test photos
        const progressInterval = setInterval(() => {
          setGenerationProgress((prev) => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + 2; // Increment by 2% every 100ms
          });
        }, 100);

        // Update status messages
        const statusMessages = [
          "🎨 AI is analyzing your test photo...",
          "✨ Blending you with your Labubu...",
          "🎭 Adding the finishing touches...",
          "🌟 Almost ready to reveal your photo...",
        ];

        let messageIndex = 0;
        const messageInterval = setInterval(() => {
          if (messageIndex < statusMessages.length) {
            setGenerationStatus(statusMessages[messageIndex]);
            messageIndex++;
          }
        }, 1250);

        // Simulate 5-second loading
        setTimeout(() => {
          clearInterval(progressInterval);
          clearInterval(messageInterval);
          setGenerationProgress(100);
          setGenerationStatus("✅ Test generation complete!");

          // Small delay to show completion
          setTimeout(() => {
            const generatedImageUrl = `/test-photos/generated${testPhotoNumber}_labubu${selectedLabubu}.svg`;
            setGeneratedImage(generatedImageUrl);

            // Create a mock blob for download functionality
            fetch(generatedImageUrl)
              .then((response) => response.blob())
              .then((blob) => setGeneratedBlob(blob))
              .catch(console.error);

            setIsGenerating(false);
            setGenerationProgress(0);
            setEstimatedTime(0);
            setGenerationStatus("");
          }, 200);
        }, 5000);

        return;
      }

      // For real photos, use the API
      if (!uploadedFile) {
        throw new Error("No file uploaded for generation");
      }

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
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}

      <header className="px-4 py-3 max-w-6xl mx-auto w-full flex justify-between items-center">
        <div className="w-1/4">
          <div className="w-full flex justify-start">
            <Link href="/" className="bg-pink-400 rounded-full px-6 py-2">
              <h1 className="text-sm sm:text-2xl font-bold text-white">Menu</h1>
            </Link>
          </div>
        </div>
        <div className="bg-violet-600 rounded-full px-6 py-2 sm:hover:scale-105 sm:hover:-rotate-2 transition-all duration-300">
          <Link href="/" className="">
            <h1 className="text-2xl sm:text-4xl font-bold text-white font-zubilo-black">
              Labubufy!
            </h1>
          </Link>
        </div>
        <div className="w-1/4">
          <div className="w-full flex justify-end">
            <Link href="/" className="bg-yellow-500 rounded-full px-6 py-2">
              <h1 className="text-sm sm:text-2xl font-bold text-white">500</h1>
            </Link>
          </div>
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
      <div className="flex-1 p-2 sm:p-4 ">
        <div className="border-3 border-zinc-900 max-w-6xl w-full mx-auto bg-zinc-50 rounded-3xl overflow-hidden min-h-[calc(100vh-8rem)] sm:h-[80vh] shadow-2xl">
          <div className="flex flex-col-reverse sm:flex-row h-full ">
            {/* Left Panel - Labubu Selection */}
            <div className="w-full sm:w-1/2 p-3 sm:p-6 bg-zinc-50 flex flex-col overflow-y-auto">
              <div className="w-full h-fit max-w-sm mx-auto flex-1 flex flex-col justify-center py-2">
                {/* Labubu Selection Grid */}
                <LabubuSelection
                  selectedLabubu={selectedLabubu}
                  onSelect={setSelectedLabubu}
                  className="mb-6 flex-shrink-0"
                />

                {/* Generate button */}
                <div className="flex-shrink-0 mt-4">
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 sm:py-5 text-sm sm:text-xl font-medium font-zubilo-black disabled:opacity-100 disabled:ring-2 disabled:ring-violet-600 disabled:ring-offset-2"
                    onClick={handleGenerate}
                    disabled={
                      !uploadedImage || selectedLabubu === null || isGenerating
                    }
                  >
                    {isGenerating ? "Labubufying..." : "Labubufy!"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Panel - Upload/Result */}
            <div className="w-full sm:w-1/2 bg-zinc-200 flex flex-col p-3 sm:p-6 overflow-y-auto">
              {/* Main content area */}
              <div className="flex-1 flex items-center justify-center sm:min-h-[300px]">
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
                  <div className="w-full">
                    <ImageUpload
                      onImageUpload={handleImageUpload}
                      onError={handleUploadError}
                    />
                    <div className="mt-6">
                      <TestPhotos onTestPhotoSelect={handleTestPhotoSelect} />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom action buttons - only show when image is generated */}
              {generatedImage && (
                <div className="flex-shrink-0 mt-4 space-y-3 pb-2 font-sans">
                  <div className="flex gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white py-2 sm:py-3 bg-white text-xs sm:text-sm"
                      onClick={handleDownload}
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white py-2 sm:py-3 bg-white text-xs sm:text-sm"
                      onClick={handleShare}
                    >
                      <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-purple-dark text-purple-dark hover:bg-purple-dark hover:text-white py-2 sm:py-3 bg-white text-xs sm:text-sm"
                      onClick={() => {
                        setGeneratedImage(null);
                        setGeneratedBlob(null);
                        setUploadedImage(null);
                        setUploadedFile(null);
                        setSelectedLabubu(null);
                        setIsTestPhoto(false);
                        setError(null);
                      }}
                    >
                      <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Reset
                    </Button>
                  </div>
                  {/* <Button
                    variant="outline"
                    className="w-full border-black text-black hover:bg-black hover:text-white py-2 sm:py-3 bg-white text-xs sm:text-sm"
                    onClick={() => {
                      setGeneratedImage(null);
                      setGeneratedBlob(null);
                      setUploadedImage(null);
                      setUploadedFile(null);
                      setSelectedLabubu(null);
                      setError(null);
                    }}
                  >
                    Reset
                  </Button> */}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-violet-600 sm:h-48">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center py-12">
          <h1 className="text-sm sm:text-2xl font-bold text-white">Footer</h1>
          <h1 className="text-sm sm:text-2xl font-bold text-white">Footer</h1>
          <h1 className="text-sm sm:text-2xl font-bold text-white">Footer</h1>
        </div>
      </footer>
    </div>
  );
}

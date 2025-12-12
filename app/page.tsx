"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/image-upload";
import { LabubuSelection } from "@/components/labubu-selection";
import { imageStorage } from "@/lib/storage";
import { sharingService } from "@/lib/sharing";
import { imageUtils, formatUtils, urlUtils } from "@/lib/utils";
import { errorHandler } from "@/lib/errors";
import { HistoryGallery } from "@/components/history-gallery";
import { ImagePreview } from "@/components/image-upload";
import { GenerationProgress } from "@/components/loading-states";
import { TestPhotos } from "@/components/test-photos";
import { CreditsDisplay } from "@/components/user-credits";
import { SaveAccountModal } from "@/components/save-account-modal";
import { SaveAccountBanner } from "@/components/save-account-banner";
import { SignInModal } from "@/components/sign-in-modal";
import { useUserStore } from "@/lib/stores/user-store";
import { AccountMenu } from "@/components/account-menu";
import { HelpModal } from "@/components/help-modal";
import { MobileMenu } from "@/components/mobile-menu";
import { SmartAuthPrompt } from "@/components/auth/smart-auth-prompt";

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
  // Zustand store
  const {
    user,
    credits: userCredits,
    isInitialized,
    isLoading,
    initialize,
    refreshCredits,
    spendCredit,
    refundCredit,
  } = useUserStore();

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
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] =
    useState(false);

  // New state for account management
  const [showSaveAccountModal, setShowSaveAccountModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [justPurchased, setJustPurchased] = useState(false);

  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Derived state
  const isAnonymous = user?.is_anonymous ?? true;

  // Polling state - use refs to persist across renders
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle credit refund
  const handleRefundCredit = React.useCallback(
    async (predictionId: string) => {
      try {
        console.log(`💰 Refunding credit for prediction: ${predictionId}`);
        await refundCredit(predictionId);
        console.log(`✅ Credit refunded. New balance: ${userCredits}`);
      } catch (error) {
        console.error("Failed to refund credit:", error);
        // Don't show error to user for refund failures
      }
    },
    [refundCredit, userCredits]
  );

  const stopPolling = React.useCallback((predictionId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    console.log(`🛑 Stopped polling for prediction: ${predictionId}`);
  }, []);

  // Initialize user store on mount
  React.useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize().catch(console.error);
    }
  }, [isInitialized, isLoading, initialize]);

  // Cleanup on component unmount
  React.useEffect(() => {
    return () => {
      if (currentPredictionId) {
        stopPolling(currentPredictionId);
      }
    };
  }, [currentPredictionId, stopPolling]);

  // Check for successful payment and show save account modal
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment") === "success") {
      setJustPurchased(true);
      // Refresh credits after payment
      refreshCredits().catch(console.error);
      // Show save account modal after a short delay if anonymous
      if (isAnonymous) {
        setTimeout(() => {
          setShowSaveAccountModal(true);
        }, 1000);
      }
    }
  }, [isAnonymous, refreshCredits]);

  const handleImageUpload = (file: File, previewUrl: string) => {
    setUploadedFile(file);
    setUploadedImage(previewUrl);
    setIsTestPhoto(false);
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
    setUploadedImage(originalImage);
    setGeneratedImage(null);
    setGeneratedBlob(null);
    setIsTestPhoto(true);
    setError(null);
  };

  const handleCreditsUpdate = () => {
    // Credits are managed by the store, this callback is for compatibility
    // The store will automatically update credits
  };

  const handleAccountSaved = async () => {
    // Refresh user status after saving account
    await refreshCredits();
  };

  const handleSignInSuccess = async () => {
    // Refresh user status after sign in
    await refreshCredits();
  };

  const startPolling = React.useCallback(
    (predictionId: string) => {
      console.log(`🚀 Starting polling for prediction: ${predictionId}`);

      const checkStatus = async () => {
        try {
          console.log(`📡 Checking status for prediction: ${predictionId}`);
          const response = await fetch(`/api/status/${predictionId}`);

          if (!response.ok) {
            throw new Error(`Status check failed: ${response.status}`);
          }

          const status: StatusResponse = await response.json();
          console.log(`📊 Status:`, status);

          // Update progress
          setGenerationProgress(status.progress);
          setEstimatedTime(status.estimated_time || 0);

          // Update status message
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

          // Handle completion
          if (status.status === "succeeded") {
            console.log(`✅ Generation completed successfully!`);

            // Clear timeout since we succeeded
            if (pollingTimeoutRef.current) {
              clearTimeout(pollingTimeoutRef.current);
              pollingTimeoutRef.current = null;
            }

            const imageUrl = Array.isArray(status.output)
              ? status.output[0]
              : status.output;

            if (!imageUrl) {
              throw new Error("No image URL in completed result");
            }

            // Download the final image
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
              throw new Error(
                `Failed to download image: ${imageResponse.status}`
              );
            }

            const blob = await imageResponse.blob();

            // Convert blob to data URL for display
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              setGeneratedImage(dataUrl);
            };
            reader.readAsDataURL(blob);

            setGeneratedBlob(blob);

            // Save to history
            if (uploadedFile && selectedLabubu !== null) {
              await imageStorage.saveImage(uploadedFile, blob, selectedLabubu);
            }

            // Reset generation state
            setIsGenerating(false);
            setGenerationProgress(0);
            setEstimatedTime(0);
            setGenerationStatus("");
            setCurrentPredictionId(null);
            stopPolling(predictionId);
          } else if (status.status === "failed") {
            console.error(`❌ Generation failed:`, status.error);

            // Refund the credit
            await handleRefundCredit(predictionId);

            throw new Error(status.error || "Generation failed");
          } else if (
            status.status === "processing" ||
            status.status === "starting"
          ) {
            console.log(`⏳ Still processing... Progress: ${status.progress}%`);
          }
        } catch (err) {
          console.error("❌ Polling error:", err);

          // Clear timeout on error
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
          }

          // Don't show error for network issues - just log and continue polling
          if (err instanceof Error && (
            err.message.includes("network") ||
            err.message.includes("fetch") ||
            err.message.includes("Failed to fetch")
          )) {
            console.warn("Network error during status check, will retry...");
            return; // Continue polling
          }

          // For other errors, show error and stop
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
      pollingIntervalRef.current = setInterval(checkStatus, 2000);

      // Set timeout to prevent infinite polling (3 minutes for Nano Banana Pro)
      pollingTimeoutRef.current = setTimeout(() => {
        if (pollingIntervalRef.current) {
          console.log(`⏰ Polling timeout reached for ${predictionId}`);
          stopPolling(predictionId);

          // Refund credit on timeout
          handleRefundCredit(predictionId).catch(console.error);

          setError("Generation is taking longer than expected. Your credit has been refunded - please try again.");
          setIsGenerating(false);
          setGenerationProgress(0);
          setEstimatedTime(0);
          setGenerationStatus("");
          setCurrentPredictionId(null);
        }
      }, 180000); // 3 minutes - increased for Nano Banana Pro
    },
    [stopPolling, handleRefundCredit, uploadedFile, selectedLabubu]
  );

  // Main generation handler
  const handleGenerate = async () => {
    if (!uploadedImage || selectedLabubu === null) return;

    // Check if user has credits
    if (!user || userCredits < 1) {
      console.log("❌ Insufficient credits");
      setShowInsufficientCreditsModal(true);
      return;
    }

    console.log(
      `✅ User has ${userCredits} credits, proceeding with generation`
    );

    setIsGenerating(true);
    setGenerationProgress(0);
    setEstimatedTime(45);
    setGenerationStatus("Initializing...");
    setError(null);
    setGeneratedImage(null);
    setGeneratedBlob(null);

    try {
      // Test photo simulation
      if (isTestPhoto) {
        const testPhotoNumber = uploadedImage.match(/original(\d+)/)?.[1];
        console.log(`🧪 Test mode: Using test photo ${testPhotoNumber}`);

        const messages = [
          "🎨 AI is analyzing your photo...",
          "✨ Blending you with your Labubu...",
          "🎭 Adding the finishing touches...",
          "🌟 Almost ready to reveal your photo...",
        ];
        let messageIndex = 0;

        const progressInterval = setInterval(() => {
          setGenerationProgress((prev) => Math.min(prev + 20, 100));
        }, 1000);

        const messageInterval = setInterval(() => {
          if (messageIndex < messages.length) {
            setGenerationStatus(messages[messageIndex]);
            messageIndex++;
          }
        }, 1250);

        setTimeout(() => {
          clearInterval(progressInterval);
          clearInterval(messageInterval);
          setGenerationProgress(100);
          setGenerationStatus("✅ Test generation complete!");

          setTimeout(() => {
            const generatedImageUrl = `/test-photos/generated${testPhotoNumber}_labubu${selectedLabubu}.svg`;
            setGeneratedImage(generatedImageUrl);

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

      // Real photo generation
      if (!uploadedFile) {
        throw new Error("No file uploaded for generation");
      }

      // Convert file to base64
      const imageBase64 = await imageUtils.fileToBase64(uploadedFile);
      console.log(`📷 Image converted to base64`);

      // Start generation and spend credit
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

      console.log(`✅ Generation started:`, result);
      const predictionId = result.prediction_id;
      setCurrentPredictionId(predictionId);

      // NOW spend the credit AFTER successful generation start
      try {
        console.log(`💰 Spending 1 credit for prediction: ${predictionId}`);
        const success = await spendCredit(predictionId);
        if (!success) {
          console.error("Failed to spend credit");
        } else {
          console.log(`✅ Credit spent. New balance: ${userCredits}`);
        }
      } catch (spendError) {
        console.error("Failed to spend credit:", spendError);
        // If credit spending fails, we should still continue with generation
        // The webhook will handle it or user can contact support
      }

      // Start polling for status
      startPolling(predictionId);
    } catch (err) {
      console.error("❌ Generation error:", err);
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
      // Refund the credit when user cancels
      handleRefundCredit(currentPredictionId).catch(console.error);
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
    const filename = formatUtils.generateFilename(selectedLabubu);
    urlUtils.downloadBlob(generatedBlob, filename);
  };

  const handleShare = async () => {
    if (!generatedBlob || selectedLabubu === null) return;

    try {
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
      handleDownload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Save Account Banner - shows for anonymous users with credits */}
      <SaveAccountBanner onSaveClick={() => setShowSaveAccountModal(true)} />

      {/* Header */}
      <header className="px-4 py-3 max-w-6xl mx-auto w-full flex justify-between items-center">
        {/* Left side - Menu */}
        <div className="w-1/4">
          <div className="w-full flex justify-start gap-2">
            {/* Desktop Menu Button */}
            <Link
              href="/"
              className="bg-pink-400 rounded-full px-6 py-2 hidden sm:block"
            >
              <h1 className="text-sm sm:text-2xl font-bold text-white">Menu</h1>
            </Link>

            {/* Mobile Menu */}
            <MobileMenu
              onSaveAccount={() => setShowSaveAccountModal(true)}
              onSignIn={() => setShowSignInModal(true)}
              onShowHistory={() => setShowHistory(true)}
              onShowHelp={() => setShowHelpModal(true)}
              onBuyCredits={() => setShowInsufficientCreditsModal(true)}
              userCredits={userCredits}
            />

            {/* Help Button (Desktop) */}
            {/* <button
              onClick={() => setShowHelpModal(true)}
              className="hidden sm:flex bg-gray-200 hover:bg-gray-300 rounded-full px-4 py-2 transition-colors items-center gap-2"
              title="Help"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              <span className="hidden md:inline text-sm text-gray-700">
                Help
              </span>
            </button> */}
          </div>
        </div>

        {/* Center - Logo */}
        <div className="bg-violet-600 rounded-full px-6 py-2 sm:hover:scale-105 sm:hover:-rotate-2 transition-all duration-300">
          <Link href="/">
            <h1 className="text-2xl sm:text-4xl font-bold text-white font-zubilo-black">
              Labubufy!
            </h1>
          </Link>
        </div>

        {/* Right side - Credits & Account */}
        <div className="w-1/4">
          <div className="w-full flex justify-end items-center gap-2">
            {/* Save Account button - only for anonymous users with credits (Desktop) */}
            {/* {isAnonymous && userCredits > 0 && (
              <Button
                onClick={() => setShowSaveAccountModal(true)}
                size="sm"
                className="hidden sm:flex bg-green-600 hover:bg-green-700 text-white"
              >
                <Shield className="w-4 h-4 mr-1" />
                Save
              </Button>
            )} */}

            {/* User Credits Component */}
            <CreditsDisplay onCreditsUpdate={handleCreditsUpdate} />

            {/* Account Menu (Desktop) */}
            <div className="hidden sm:block">
              <AccountMenu
                onSaveAccount={() => setShowSaveAccountModal(true)}
                onSignIn={() => setShowSignInModal(true)}
                onShowHistory={() => setShowHistory(true)}
              />
            </div>
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

      {/* Success message after purchase */}
      {justPurchased && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mx-4 mt-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">
                ✅ Payment successful! Your credits have been added.
              </p>
              <button
                onClick={() => setJustPurchased(false)}
                className="mt-2 text-sm text-green-600 underline hover:text-green-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Credits Modal */}
      {showInsufficientCreditsModal && (
        <InsufficientCreditsModal
          onClose={() => setShowInsufficientCreditsModal(false)}
          onShowHelp={() => setShowHelpModal(true)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 p-2 sm:p-4">
        <div className="border-3 border-zinc-900 max-w-6xl w-full mx-auto bg-zinc-50 rounded-3xl overflow-hidden min-h-[calc(100vh-8rem)] sm:h-[80vh] shadow-2xl">
          <div className="flex flex-col-reverse sm:flex-row h-full">
            {/* Left Panel - Labubu Selection */}
            <div className="w-full sm:w-1/2 p-3 sm:p-6 bg-zinc-50 flex flex-col overflow-y-auto">
              <div className="w-full h-fit max-w-sm mx-auto flex-1 flex flex-col justify-center py-2">
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

                  {/* Credit cost indicator */}
                  {!isGenerating &&
                    uploadedImage &&
                    selectedLabubu !== null && (
                      <div className="text-center mt-2 text-sm text-gray-600">
                        <span className="font-medium">Cost: 1 credit</span>
                        {userCredits > 0 ? (
                          <span className="ml-2 text-green-600">
                            • {userCredits} credits available
                          </span>
                        ) : (
                          <span className="ml-2 text-red-600">
                            • No credits available
                          </span>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Right Panel - Upload/Result */}
            <div className="w-full sm:w-1/2 bg-zinc-200 flex flex-col p-3 sm:p-6 overflow-y-auto">
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
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {generatedImage && !isGenerating && (
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleDownload}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Download
                  </Button>
                  <Button
                    onClick={handleShare}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Share
                  </Button>
                </div>
              )}

              {/* Test Photos */}
              {!uploadedImage && !isGenerating && (
                <div className="mt-4">
                  <TestPhotos onTestPhotoSelect={handleTestPhotoSelect} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Gallery */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <HistoryGallery
              onClose={() => setShowHistory(false)}
              isOpen={showHistory}
            />
          </div>
        </div>
      )}

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Save Account Modal */}
      <SaveAccountModal
        isOpen={showSaveAccountModal}
        onClose={() => setShowSaveAccountModal(false)}
        onSuccess={handleAccountSaved}
      />

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSuccess={handleSignInSuccess}
      />

      {/* Smart Auth Prompt */}
      <SmartAuthPrompt />
    </div>
  );
}

// Insufficient Credits Modal Component
interface InsufficientCreditsModalProps {
  onClose: () => void;
  onShowHelp: () => void;
}

function InsufficientCreditsModal({
  onClose,
  onShowHelp,
}: InsufficientCreditsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! No Credits Left
          </h2>
          <p className="text-gray-600 mb-6">
            You need at least 1 credit to generate an image. Purchase more
            credits to continue creating amazing photos!
          </p>

          <div className="space-y-3">
            <Button
              onClick={onClose}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3"
            >
              Buy Credits Now
            </Button>
            <Button onClick={onClose} variant="outline" className="w-full">
              Maybe Later
            </Button>
          </div>

          <button
            onClick={() => {
              onClose();
              onShowHelp();
            }}
            className="text-sm text-gray-500 hover:text-gray-700 mt-4"
          >
            Learn more about credits →
          </button>
        </div>
      </div>
    </div>
  );
}

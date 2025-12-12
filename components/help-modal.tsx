// components/help-modal.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  HelpCircle,
  Shield,
  CreditCard,
  Smartphone,
  Upload,
  Download,
  Share2,
} from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-violet-600" />
            <h2 className="text-xl font-bold text-gray-900">
              How Labubufy Works
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          {/* Getting Started */}
          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Getting Started
            </h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-violet-600">1.</span>
                <span>
                  <strong>Upload a photo</strong> - Choose a photo from your
                  device or use one of our test photos
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-violet-600">2.</span>
                <span>
                  <strong>Select a Labubu</strong> - Pick your favorite Labubu
                  character from the collection
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-violet-600">3.</span>
                <span>
                  <strong>Click Labubufy!</strong> - Our AI will create a photo
                  with you holding your Labubu
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-violet-600">4.</span>
                <span>
                  <strong>Download & Share</strong> - Save your creation and
                  share it with friends!
                </span>
              </li>
            </ol>
          </section>

          {/* Credits System */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-violet-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Credits System
              </h3>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                <p className="font-medium text-violet-900 mb-1">
                  🎉 Free Credits
                </p>
                <p className="text-violet-700">
                  New users get <strong>3 free credits</strong> to try out
                  Labubufy!
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="font-medium text-gray-900 mb-1">
                  💰 How Credits Work
                </p>
                <ul className="space-y-1 text-gray-700 ml-4 list-disc">
                  <li>Each image generation costs 1 credit</li>
                  <li>Credits never expire</li>
                  <li>Purchase more anytime you need them</li>
                  <li>Best value: 2,500 credits for $19.99</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Account Protection */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Protect Your Credits
              </h3>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900 mb-2">
                <strong>⚠️ Important:</strong> By default, you&apos;re using{" "}
                <strong>Guest Mode</strong>.
              </p>
              <p className="text-sm text-yellow-800 mb-3">
                In Guest Mode, your credits are saved to this browser only. If
                you:
              </p>
              <ul className="space-y-1 text-sm text-yellow-800 ml-4 list-disc mb-3">
                <li>Clear your browser data</li>
                <li>Switch to a different device</li>
                <li>Use a different browser</li>
              </ul>
              <p className="text-sm text-yellow-900 mb-3">
                ...you&apos;ll lose access to your credits! 😢
              </p>
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm font-medium text-green-900 mb-1">
                  ✅ Solution: Save Your Account
                </p>
                <p className="text-sm text-green-800">
                  Create an account with your email to access your credits from
                  any device, anytime!
                </p>
              </div>
            </div>
          </section>

          {/* Cross-Device Access */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Use on Any Device
              </h3>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <p>Once you save your account:</p>
              <ul className="space-y-1 ml-4 list-disc text-gray-600">
                <li>Sign in from your phone, tablet, or computer</li>
                <li>All your credits travel with you</li>
                <li>Access your photo history anywhere</li>
                <li>Never worry about losing credits</li>
              </ul>
            </div>
          </section>

          {/* Tips & Tricks */}
          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Tips for Best Results
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex gap-2">
                <Upload className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Photo Quality:</strong> Use clear, well-lit photos for
                  best results
                </div>
              </div>
              <div className="flex gap-2">
                <Download className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Save Your Work:</strong> Download images you love -
                  they&apos;re yours forever!
                </div>
              </div>
              <div className="flex gap-2">
                <Share2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Share:</strong> Use the share button to post directly
                  to social media
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Frequently Asked Questions
            </h3>
            <div className="space-y-3">
              <details className="bg-gray-50 rounded-lg p-3">
                <summary className="font-medium text-gray-900 cursor-pointer">
                  How long does generation take?
                </summary>
                <p className="text-sm text-gray-600 mt-2">
                  Most images are generated in 30-60 seconds. Complex photos may
                  take a bit longer.
                </p>
              </details>

              <details className="bg-gray-50 rounded-lg p-3">
                <summary className="font-medium text-gray-900 cursor-pointer">
                  What happens if generation fails?
                </summary>
                <p className="text-sm text-gray-600 mt-2">
                  Don&apos;t worry! If generation fails, your credit is
                  automatically refunded. You can try again with a different
                  photo.
                </p>
              </details>

              <details className="bg-gray-50 rounded-lg p-3">
                <summary className="font-medium text-gray-900 cursor-pointer">
                  Can I get a refund on credits?
                </summary>
                <p className="text-sm text-gray-600 mt-2">
                  Credits are non-refundable, but they never expire. Take your
                  time using them!
                </p>
              </details>

              <details className="bg-gray-50 rounded-lg p-3">
                <summary className="font-medium text-gray-900 cursor-pointer">
                  Is my photo data secure?
                </summary>
                <p className="text-sm text-gray-600 mt-2">
                  Yes! Photos are processed securely and are not stored on our
                  servers after generation.
                </p>
              </details>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            Need more help? Contact us at support@labubufy.com
          </p>
        </div>
      </div>
    </div>
  );
}

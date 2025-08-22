"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, Share2 } from "lucide-react";

const labubuOptions = [
  {
    id: 1,
    name: "Classic Pink",
    color: "bg-pink-400",
    image: "/cute-pink-labubu-doll-with-bow.png",
  },
  {
    id: 2,
    name: "Blue Dreamer",
    color: "bg-blue-400",
    image: "/blue-sleepy-labubu.png",
  },
  {
    id: 3,
    name: "Yellow Sunshine",
    color: "bg-yellow-400",
    image: "/happy-yellow-labubu.png",
  },
  {
    id: 4,
    name: "Purple Magic",
    color: "bg-purple-400",
    image: "/mystical-purple-labubu.png",
  },
  {
    id: 5,
    name: "Green Forest",
    color: "bg-green-400",
    image: "/nature-green-labubu.png",
  },
  {
    id: 6,
    name: "Orange Sunset",
    color: "bg-orange-400",
    image: "/warm-orange-labubu.png",
  },
];

export default function LabubufyApp() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedLabubu, setSelectedLabubu] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage || selectedLabubu === null) return;

    setIsGenerating(true);
    // Simulate AI generation delay
    setTimeout(() => {
      setGeneratedImage("/magical-labubu-photo.png");
      setIsGenerating(false);
    }, 3000);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = generatedImage || "";
    link.download = "my-labubu-photo.jpg";
    link.click();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4">
      <div className="max-w-6xl w-full border-2 border-red-200 bg-white rounded-lg overflow-hidden h-[90vh]">
        <div className="flex flex-col-reverse sm:flex-row h-full">
          {/* Left Panel - Labubu Selection */}
          <div className="w-full sm:w-1/2 p-4 sm:p-6 sm:border-r border-gray-200 flex flex-col">
            <div className="w-full h-fit max-w-sm mx-auto flex-1 flex flex-col justify-center">

              {/* Labubu Grid - 2x3 colorful rectangles */}
              <div className="grid grid-cols-3 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 flex-shrink-0">
                {labubuOptions.map((labubu) => (
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
                    !uploadedImage || selectedLabubu === null || isGenerating
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
  );
}

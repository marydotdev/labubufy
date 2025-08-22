"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Download, 
  Trash2, 
  Share2, 
  Calendar,
  AlertTriangle
} from "lucide-react";
import { imageStorage, type ImageMetadata } from "@/lib/storage";
import { formatUtils, urlUtils, deviceUtils } from "@/lib/utils";
import { HistoryGallerySkeleton, EmptyState } from "@/components/loading-states";

interface HistoryGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryGallery({ isOpen, onClose }: HistoryGalleryProps) {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadImages();
    }
  }, [isOpen]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const metadata = await imageStorage.getAllMetadata();
      setImages(metadata);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      await imageStorage.deleteImage(id);
      setImages(prev => prev.filter(img => img.id !== id));
      setShowDeleteConfirm(null);
      if (selectedImage === id) {
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await imageStorage.clearAll();
      setImages([]);
      setSelectedImage(null);
    } catch (error) {
      console.error('Failed to clear all images:', error);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const storedImage = await imageStorage.getImage(id);
      if (storedImage) {
        urlUtils.downloadBlob(storedImage.generatedImage, storedImage.filename);
      }
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const handleShare = async (id: string) => {
    try {
      const storedImage = await imageStorage.getImage(id);
      if (!storedImage) return;

      if (deviceUtils.supportsWebShare()) {
        const file = new File([storedImage.generatedImage], storedImage.filename, { 
          type: 'image/jpeg' 
        });
        
        await navigator.share({
          title: 'My Labubu Photo',
          text: 'Check out my awesome Labubu photo!',
          files: [file]
        });
      } else {
        // Fallback to download
        handleDownload(id);
      }
    } catch (error) {
      console.log('Share cancelled or failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Photo History</h2>
            <p className="text-sm text-gray-600">
              {images.length} {images.length === 1 ? 'photo' : 'photos'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {images.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm('all')}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <HistoryGallerySkeleton />
          ) : images.length === 0 ? (
            <EmptyState
              title="No photos yet"
              description="Your generated Labubu photos will appear here"
              icon={<Calendar className="w-12 h-12" />}
              className="py-16"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
              {images.map((image) => (
                <HistoryImageCard
                  key={image.id}
                  image={image}
                  onSelect={() => setSelectedImage(image.id)}
                  onDelete={() => setShowDeleteConfirm(image.id)}
                  onDownload={() => handleDownload(image.id)}
                  onShare={() => handleShare(image.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Detail Modal */}
      {selectedImage && (
        <ImageDetailModal
          imageId={selectedImage}
          onClose={() => setSelectedImage(null)}
          onDelete={() => {
            setShowDeleteConfirm(selectedImage);
            setSelectedImage(null);
          }}
          onDownload={() => handleDownload(selectedImage)}
          onShare={() => handleShare(selectedImage)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          isAll={showDeleteConfirm === 'all'}
          onConfirm={showDeleteConfirm === 'all' ? handleClearAll : () => handleDeleteImage(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

interface HistoryImageCardProps {
  image: ImageMetadata;
  onSelect: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onShare: () => void;
}

function HistoryImageCard({ image, onSelect, onDelete, onDownload, onShare }: HistoryImageCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const storedImage = await imageStorage.getImage(image.id);
        if (storedImage) {
          const url = URL.createObjectURL(storedImage.generatedImage);
          setImageUrl(url);
          
          // Cleanup URL when component unmounts
          return () => URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    };

    loadImage();
  }, [image.id]);

  return (
    <div className="group relative bg-gray-100 rounded-lg overflow-hidden aspect-square">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Generated Labubu photo"
          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
          onClick={onSelect}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Overlay with actions */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onDownload} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onShare} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Date label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
        <p className="text-white text-xs">
          {formatUtils.formatTimestamp(image.timestamp)}
        </p>
      </div>
    </div>
  );
}

interface ImageDetailModalProps {
  imageId: string;
  onClose: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onShare: () => void;
}

function ImageDetailModal({ imageId, onClose, onDelete, onDownload, onShare }: ImageDetailModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const storedImage = await imageStorage.getImage(imageId);
        const allMetadata = await imageStorage.getAllMetadata();
        const imageMetadata = allMetadata.find(m => m.id === imageId);
        
        if (storedImage && imageMetadata) {
          const url = URL.createObjectURL(storedImage.generatedImage);
          setImageUrl(url);
          setMetadata(imageMetadata);
          
          return () => URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Failed to load image details:', error);
      }
    };

    loadImage();
  }, [imageId]);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Photo Details</h3>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Generated Labubu photo"
              className="w-full max-h-96 object-contain rounded-lg mb-4"
            />
          )}

          {metadata && (
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><strong>Created:</strong> {new Date(metadata.timestamp).toLocaleString()}</p>
              <p><strong>File size:</strong> {formatUtils.formatFileSize(metadata.generatedSize)}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={onDownload} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={onShare} className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" onClick={onDelete} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  isAll: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ isAll, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-semibold">Confirm Delete</h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          {isAll 
            ? "Are you sure you want to delete all photos? This action cannot be undone."
            : "Are you sure you want to delete this photo? This action cannot be undone."
          }
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Image processing utilities
export const imageUtils = {
  // Convert file to base64
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Convert blob to base64
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  // Resize image while maintaining aspect ratio
  async resizeImage(file: File, maxWidth: number, maxHeight: number, quality = 0.85): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  },

  // Strip EXIF data for privacy
  async stripExifData(file: File): Promise<Blob> {
    // For now, just convert to blob which removes EXIF
    // In production, you might want to use a library like piexifjs
    return this.resizeImage(file, 2048, 2048, 0.9);
  },

  // Convert HEIC to JPEG (placeholder - would need heic2any library)
  async convertHeicToJpeg(file: File): Promise<File> {
    // This is a placeholder. In production, you'd use heic2any library
    if (file.type === 'image/heic') {
      throw new Error('HEIC conversion not yet implemented');
    }
    return file;
  },
};

// Format utilities
export const formatUtils = {
  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Format timestamp
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  },

  // Generate filename
  generateFilename(labubuId: number, extension = 'jpg'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const random = Math.random().toString(36).substr(2, 5);
    return `labubu_${labubuId}_${timestamp}_${random}.${extension}`;
  },
};

// Device detection utilities
export const deviceUtils = {
  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  isTablet(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
  },

  isDesktop(): boolean {
    return !this.isMobile() && !this.isTablet();
  },

  supportsWebShare(): boolean {
    if (typeof window === 'undefined') return false;
    return 'share' in navigator;
  },

  supportsCamera(): boolean {
    if (typeof window === 'undefined') return false;
    return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
  },
};

// URL utilities
export const urlUtils = {
  // Create temporary URL for sharing (placeholder)
  createShareUrl(imageId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/share/${imageId}`;
  },

  // Download blob as file
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
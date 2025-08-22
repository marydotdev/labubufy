import { deviceUtils } from './utils';
import { NetworkError } from './errors';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'download' | 'fallback';
  error?: string;
}

export class SharingService {
  /**
   * Share image with the best available method
   */
  async shareImage(
    blob: Blob, 
    filename: string, 
    options: Partial<ShareOptions> = {}
  ): Promise<ShareResult> {
    const shareOptions: ShareOptions = {
      title: options.title || 'My Labubu Photo',
      text: options.text || 'Check out my awesome Labubu photo created with Labubufy!',
      url: options.url,
      ...options
    };

    // Try native sharing first (mobile)
    if (deviceUtils.supportsWebShare()) {
      try {
        const file = new File([blob], filename, { type: blob.type });
        await navigator.share({
          title: shareOptions.title,
          text: shareOptions.text,
          files: [file]
        });
        
        return { success: true, method: 'native' };
      } catch (error) {
        // User cancelled or sharing failed
        if ((error as Error).name === 'AbortError') {
          return { success: false, method: 'native', error: 'User cancelled sharing' };
        }
      }
    }

    // Try clipboard API (modern browsers)
    if (await this.tryClipboardShare(blob, shareOptions)) {
      return { success: true, method: 'clipboard' };
    }

    // Fallback to download
    this.downloadBlob(blob, filename);
    return { success: true, method: 'download' };
  }

  /**
   * Try to copy image to clipboard
   */
  private async tryClipboardShare(blob: Blob, _options: ShareOptions): Promise<boolean> {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) {
        return false;
      }

      // Create clipboard item with image
      const clipboardItem = new ClipboardItem({
        [blob.type]: blob
      });

      await navigator.clipboard.write([clipboardItem]);
      
      // Show success notification
      this.showNotification('Image copied to clipboard! You can now paste it anywhere.');
      
      return true;
    } catch (error) {
      console.log('Clipboard sharing failed:', error);
      return false;
    }
  }

  /**
   * Download blob as file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(url);
    
    this.showNotification('Image downloaded to your device!');
  }

  /**
   * Share via social media URLs (fallback method)
   */
  async shareToSocialMedia(
    platform: 'twitter' | 'facebook' | 'instagram' | 'whatsapp',
    options: ShareOptions
  ): Promise<ShareResult> {
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(options.text || '')}&url=${encodeURIComponent(options.url || '')}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(options.url || '')}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent((options.text || '') + ' ' + (options.url || ''))}`,
      instagram: '' // Instagram doesn't support direct URL sharing
    };

    if (platform === 'instagram') {
      return { 
        success: false, 
        method: 'fallback', 
        error: 'Instagram sharing requires manual upload' 
      };
    }

    try {
      const url = urls[platform];
      window.open(url, '_blank', 'width=600,height=400');
      return { success: true, method: 'fallback' };
    } catch (_error) {
      return { 
        success: false, 
        method: 'fallback', 
        error: 'Failed to open sharing window' 
      };
    }
  }

  /**
   * Create shareable link for image
   */
  async createShareableLink(_blob: Blob): Promise<string> {
    // In a real app, you'd upload to a cloud service and get a URL
    // For now, we'll create a temporary object URL
    try {
      // In production, upload to cloud storage and return permanent URL
      // For demo, return a mock URL
      const mockId = Math.random().toString(36).substr(2, 9);
      return `${window.location.origin}/share/${mockId}`;
    } catch (_error) {
      throw new NetworkError('Failed to create shareable link');
    }
  }

  /**
   * Show notification to user
   */
  private showNotification(message: string): void {
    // Try modern notification API first
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Labubufy', {
        body: message,
        icon: '/favicon.ico'
      });
      return;
    }

    // Fallback to custom toast notification
    this.showToast(message);
  }

  /**
   * Show custom toast notification
   */
  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'transform 0.3s ease-out';
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  /**
   * Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Generate optimized filename for sharing
   */
  generateShareFilename(labubuId: number, format: 'jpg' | 'png' = 'jpg'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const labubuName = this.getLabubuName(labubuId);
    return `labubu-${labubuName}-${timestamp}.${format}`;
  }

  /**
   * Get Labubu name by ID
   */
  private getLabubuName(labubuId: number): string {
    const names: Record<number, string> = {
      1: 'pink',
      2: 'blue', 
      3: 'yellow',
      4: 'purple',
      5: 'green',
      6: 'orange'
    };
    return names[labubuId] || 'custom';
  }

  /**
   * Check sharing capabilities
   */
  getCapabilities() {
    return {
      nativeShare: deviceUtils.supportsWebShare(),
      clipboard: !!(navigator.clipboard && window.ClipboardItem),
      notifications: 'Notification' in window,
      isMobile: deviceUtils.isMobile(),
    };
  }
}

// Singleton instance
export const sharingService = new SharingService();
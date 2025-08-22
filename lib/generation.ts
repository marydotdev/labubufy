import { retryHandler, GenerationError, NetworkError } from './errors';
import { CONFIG } from './config';

export interface GenerationRequest {
  image: string;
  labubu_id: number;
}

export interface GenerationResponse {
  success: boolean;
  prediction_id: string;
  status: string;
  output?: string | string[];
  error?: string;
  labubu_id: number;
  mock?: boolean;
}

export interface StatusResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
  logs?: string;
  progress: number;
  estimated_time: number;
}

export class GenerationService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start image generation
   */
  async startGeneration(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GenerationError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          { status: response.status, request }
        );
      }

      const result: GenerationResponse = await response.json();

      if (!result.success) {
        throw new GenerationError(
          result.error || 'Generation failed',
          { result, request }
        );
      }

      return result;
    } catch (error) {
      if (error instanceof GenerationError) {
        throw error;
      }
      
      // Network or other errors
      throw new NetworkError(
        'Failed to start generation. Please check your connection.',
        { originalError: error, request }
      );
    }
  }

  /**
   * Check generation status
   */
  async checkStatus(predictionId: string): Promise<StatusResponse> {
    try {
      const response = await retryHandler.withRetry(async () => {
        const res = await fetch(`/api/status/${predictionId}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            throw new GenerationError('Prediction not found', { predictionId });
          }
          throw new NetworkError(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return res;
      }, 2, 1000);

      const status: StatusResponse = await response.json();

      if (status.error) {
        throw new GenerationError(status.error, { predictionId, status });
      }

      return status;
    } catch (error) {
      if (error instanceof GenerationError || error instanceof NetworkError) {
        throw error;
      }
      
      throw new NetworkError(
        'Failed to check generation status',
        { originalError: error, predictionId }
      );
    }
  }

  /**
   * Start polling for status updates
   */
  startPolling(
    predictionId: string,
    onProgress: (status: StatusResponse) => void,
    onComplete: (status: StatusResponse) => void,
    onError: (error: Error) => void
  ): void {
    // Clear any existing polling for this prediction
    this.stopPolling(predictionId);

    const poll = async () => {
      try {
        const status = await this.checkStatus(predictionId);
        
        // Update progress
        onProgress(status);

        // Check if complete
        if (status.status === 'succeeded') {
          this.stopPolling(predictionId);
          onComplete(status);
        } else if (status.status === 'failed' || status.status === 'canceled') {
          this.stopPolling(predictionId);
          onError(new GenerationError(
            status.error || `Generation ${status.status}`,
            { predictionId, status }
          ));
        } else {
          // Continue polling if still processing
          const interval = setTimeout(poll, CONFIG.POLLING_INTERVAL);
          this.pollingIntervals.set(predictionId, interval);
        }
      } catch (error) {
        this.stopPolling(predictionId);
        onError(error as Error);
      }
    };

    // Start polling immediately
    poll();
  }

  /**
   * Stop polling for a specific prediction
   */
  stopPolling(predictionId: string): void {
    const interval = this.pollingIntervals.get(predictionId);
    if (interval) {
      clearTimeout(interval);
      this.pollingIntervals.delete(predictionId);
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    this.pollingIntervals.forEach((interval) => clearTimeout(interval));
    this.pollingIntervals.clear();
  }

  /**
   * Download image from URL
   */
  async downloadImage(imageUrl: string, _filename?: string): Promise<Blob> {
    try {
      const response = await retryHandler.withRetry(async () => {
        const res = await fetch(imageUrl);
        if (!res.ok) {
          throw new NetworkError(`Failed to download image: ${res.status}`);
        }
        return res;
      }, 3, 1000);

      const blob = await response.blob();
      
      // Validate blob
      if (blob.size === 0) {
        throw new GenerationError('Downloaded image is empty');
      }

      return blob;
    } catch (error) {
      if (error instanceof GenerationError || error instanceof NetworkError) {
        throw error;
      }
      
      throw new NetworkError(
        'Failed to download generated image',
        { originalError: error, imageUrl }
      );
    }
  }

  /**
   * Convert image URL to data URL for preview
   */
  async imageUrlToDataUrl(imageUrl: string): Promise<string> {
    try {
      const blob = await this.downloadImage(imageUrl);
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new GenerationError(
        'Failed to convert image for preview',
        { originalError: error, imageUrl }
      );
    }
  }

  /**
   * Complete generation flow with polling
   */
  async generateWithPolling(
    request: GenerationRequest,
    onProgress: (progress: number, estimatedTime?: number, status?: string) => void
  ): Promise<{ imageUrl: string; blob: Blob }> {
    return new Promise(async (resolve, reject) => {
      try {
        // Start generation
        const startResult = await this.startGeneration(request);
        
        // Set up polling
        this.startPolling(
          startResult.prediction_id,
          
          // Progress callback
          (status) => {
            onProgress(status.progress, status.estimated_time, status.status);
          },
          
          // Complete callback
          async (status) => {
            try {
              const imageUrl = Array.isArray(status.output) 
                ? status.output[0] 
                : status.output;
                
              if (!imageUrl) {
                throw new GenerationError('No image URL in completed result');
              }

              // Download the final image
              const blob = await this.downloadImage(imageUrl);
              
              resolve({ imageUrl, blob });
            } catch (error) {
              reject(error);
            }
          },
          
          // Error callback
          (error) => {
            reject(error);
          }
        );

        // Set timeout to prevent infinite polling
        setTimeout(() => {
          this.stopPolling(startResult.prediction_id);
          reject(new GenerationError('Generation timeout after 2 minutes'));
        }, 120000); // 2 minutes

      } catch (error) {
        reject(error);
      }
    });
  }
}

// Singleton instance
export const generationService = new GenerationService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    generationService.stopAllPolling();
  });
}
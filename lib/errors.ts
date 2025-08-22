// Error types for the application
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK', 
  API = 'API',
  STORAGE = 'STORAGE',
  GENERATION = 'GENERATION',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: unknown;
  retryable?: boolean;
}

// Custom error classes
export class LabubuError extends Error {
  public type: ErrorType;
  public code?: string;
  public details?: unknown;
  public retryable: boolean;

  constructor(type: ErrorType, message: string, code?: string, details?: unknown, retryable = false) {
    super(message);
    this.name = 'LabubuError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

// Specific error classes
export class ValidationError extends LabubuError {
  constructor(message: string, details?: unknown) {
    super(ErrorType.VALIDATION, message, 'VALIDATION_ERROR', details, false);
  }
}

export class NetworkError extends LabubuError {
  constructor(message: string, details?: unknown) {
    super(ErrorType.NETWORK, message, 'NETWORK_ERROR', details, true);
  }
}

export class APIError extends LabubuError {
  constructor(message: string, code?: string, details?: unknown) {
    super(ErrorType.API, message, code, details, true);
  }
}

export class StorageError extends LabubuError {
  constructor(message: string, details?: unknown) {
    super(ErrorType.STORAGE, message, 'STORAGE_ERROR', details, false);
  }
}

export class GenerationError extends LabubuError {
  constructor(message: string, details?: unknown, retryable = true) {
    super(ErrorType.GENERATION, message, 'GENERATION_ERROR', details, retryable);
  }
}

// Error handling utilities
export const errorHandler = {
  // Parse and normalize errors
  parseError(error: unknown): AppError {
    if (error instanceof LabubuError) {
      return {
        type: error.type,
        message: error.message,
        code: error.code,
        details: error.details,
        retryable: error.retryable,
      };
    }

    if (error instanceof Error) {
      return {
        type: ErrorType.UNKNOWN,
        message: error.message,
        retryable: false,
      };
    }

    if (typeof error === 'string') {
      return {
        type: ErrorType.UNKNOWN,
        message: error,
        retryable: false,
      };
    }

    return {
      type: ErrorType.UNKNOWN,
      message: 'An unknown error occurred',
      retryable: false,
    };
  },

  // Get user-friendly error messages
  getUserMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.VALIDATION:
        return error.message;
        
      case ErrorType.NETWORK:
        return 'Network connection failed. Please check your internet connection and try again.';
        
      case ErrorType.API:
        if (error.code === 'RATE_LIMIT') {
          return 'Too many requests. Please wait a moment and try again.';
        }
        if (error.code === 'UNAUTHORIZED') {
          return 'Service temporarily unavailable. Please try again later.';
        }
        return 'Service error. Please try again in a few moments.';
        
      case ErrorType.STORAGE:
        return 'Storage error. Your device may be out of space.';
        
      case ErrorType.GENERATION:
        return 'Image generation failed. Please try again with a different photo.';
        
      default:
        return 'Something went wrong. Please try again.';
    }
  },

  // Log errors (you can extend this to send to monitoring service)
  logError(error: AppError, context?: unknown): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error,
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
    };

    console.error('Application Error:', logData);

    // In production, you would send this to your monitoring service
    // Example: Sentry, LogRocket, etc.
  },
};

// File validation utilities
export const fileValidator = {
  validateFile(file: File): void {
    if (!file) {
      throw new ValidationError('No file selected');
    }

    // Check file size - allow up to 100MB for large images
    const maxSize = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '104857600'); // 100MB
    if (file.size > maxSize) {
      throw new ValidationError(
        `File size too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`,
        { fileSize: file.size, maxSize }
      );
    }

    // Check file type
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!supportedTypes.includes(file.type)) {
      throw new ValidationError(
        'Unsupported file format. Please use JPEG, PNG, WebP, or HEIC',
        { fileType: file.type, supportedTypes }
      );
    }
  },

  async validateImageDimensions(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const minSize = 256; // Reduced minimum size to handle smaller images
        
        if (img.width < minSize || img.height < minSize) {
          reject(new ValidationError(
            `Image too small. Minimum size is ${minSize}x${minSize} pixels`,
            { width: img.width, height: img.height, minSize }
          ));
        } else {
          // No maximum validation here - we'll handle large images with optimization
          resolve();
        }
      };

      img.onerror = () => {
        reject(new ValidationError('Invalid image file'));
      };

      img.src = URL.createObjectURL(file);
    });
  },
};

// Retry utilities
export const retryHandler = {
  async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const appError = errorHandler.parseError(error);
        
        // Don't retry if error is not retryable
        if (!appError.retryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError;
  },
};
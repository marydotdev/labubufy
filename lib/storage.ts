import { CONFIG } from './config';

export interface StoredImage {
  id: string;
  originalImage: Blob;
  generatedImage: Blob;
  labubuId: number;
  timestamp: number;
  filename: string;
}

export interface ImageMetadata {
  id: string;
  labubuId: number;
  timestamp: number;
  filename: string;
  originalSize: number;
  generatedSize: number;
}

class ImageStorage {
  private dbName = 'LabubuImages';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create images store
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'id' });
          imageStore.createIndex('timestamp', 'timestamp', { unique: false });
          imageStore.createIndex('labubuId', 'labubuId', { unique: false });
        }

        // Create metadata store for quick queries
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'id' });
          metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveImage(
    originalImage: Blob,
    generatedImage: Blob,
    labubuId: number
  ): Promise<string> {
    if (!this.db) await this.init();

    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const filename = `labubu_${labubuId}_${new Date(timestamp).toISOString().split('T')[0]}.jpg`;

    const imageData: StoredImage = {
      id,
      originalImage,
      generatedImage,
      labubuId,
      timestamp,
      filename,
    };

    const metadata: ImageMetadata = {
      id,
      labubuId,
      timestamp,
      filename,
      originalSize: originalImage.size,
      generatedSize: generatedImage.size,
    };

    // Check storage limits before saving
    await this.enforceStorageLimits();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['images', 'metadata'], 'readwrite');
      
      transaction.oncomplete = () => resolve(id);
      transaction.onerror = () => reject(transaction.error);

      const imageStore = transaction.objectStore('images');
      const metadataStore = transaction.objectStore('metadata');

      imageStore.add(imageData);
      metadataStore.add(metadata);
    });
  }

  async getImage(id: string): Promise<StoredImage | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllMetadata(): Promise<ImageMetadata[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        const results = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteImage(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['images', 'metadata'], 'readwrite');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const imageStore = transaction.objectStore('images');
      const metadataStore = transaction.objectStore('metadata');

      imageStore.delete(id);
      metadataStore.delete(id);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['images', 'metadata'], 'readwrite');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const imageStore = transaction.objectStore('images');
      const metadataStore = transaction.objectStore('metadata');

      imageStore.clear();
      metadataStore.clear();
    });
  }

  async getStorageUsage(): Promise<{ count: number; size: number }> {
    const metadata = await this.getAllMetadata();
    const count = metadata.length;
    const size = metadata.reduce((total, item) => total + item.originalSize + item.generatedSize, 0);

    return { count, size };
  }

  private async enforceStorageLimits(): Promise<void> {
    const { count, size } = await this.getStorageUsage();

    // Remove oldest images if we exceed limits
    if (count >= CONFIG.MAX_HISTORY_ITEMS || size >= CONFIG.MAX_HISTORY_SIZE) {
      const metadata = await this.getAllMetadata();
      const oldestItems = metadata.slice(CONFIG.MAX_HISTORY_ITEMS - 1);

      for (const item of oldestItems) {
        await this.deleteImage(item.id);
      }
    }

    // Clean up images older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const metadata = await this.getAllMetadata();
    const expiredItems = metadata.filter(item => item.timestamp < thirtyDaysAgo);

    for (const item of expiredItems) {
      await this.deleteImage(item.id);
    }
  }

  // Export all images as a ZIP file (for future implementation)
  async exportAll(): Promise<Blob> {
    // This would require a ZIP library like JSZip
    throw new Error('Export functionality not yet implemented');
  }
}

// Singleton instance
export const imageStorage = new ImageStorage();

// Local storage utilities for user preferences
export const preferences = {
  get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}${key}`);
  },

  set(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${CONFIG.STORAGE_KEY_PREFIX}${key}`, value);
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${CONFIG.STORAGE_KEY_PREFIX}${key}`);
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage).filter(key => key.startsWith(CONFIG.STORAGE_KEY_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
  }
};
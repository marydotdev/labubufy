// Application configuration constants
export const CONFIG = {
  // File upload limits
  MAX_FILE_SIZE: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || "10485760"), // 10MB
  SUPPORTED_FORMATS: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  MIN_RESOLUTION: 640,

  // Storage limits
  MAX_HISTORY_ITEMS: parseInt(
    process.env.NEXT_PUBLIC_MAX_HISTORY_ITEMS || "50"
  ),
  MAX_HISTORY_SIZE: parseInt(
    process.env.NEXT_PUBLIC_MAX_HISTORY_SIZE || "104857600"
  ), // 100MB
  STORAGE_KEY_PREFIX: "labubufy_",

  // Generation settings
  GENERATION_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  POLLING_INTERVAL: 2000, // 2 seconds

  // Image output settings
  OUTPUT_QUALITY: 0.85,
  OUTPUT_FORMAT: "image/jpeg",
  MIN_OUTPUT_SIZE: 1080,
} as const;

// Labubu character definitions
export const LABUBU_DOLLS = [
  {
    id: 1,
    name: "Classic Pink",
    color: "bg-pink-400",
    image: "/labubu-images/dolls/labubu1.png",
    description: "Sweet and adorable pink Labubu",
    type: "doll" as const,
  },
  {
    id: 2,
    name: "Blue Dreamer",
    color: "bg-blue-400",
    image: "/labubu-images/dolls/labubu2.png",
    description: "Calm and dreamy blue Labubu",
    type: "doll" as const,
  },
  {
    id: 3,
    name: "Yellow Sunshine",
    color: "bg-yellow-400",
    image: "/labubu-images/dolls/labubu3.png",
    description: "Bright and cheerful yellow Labubu",
    type: "doll" as const,
  },
  {
    id: 4,
    name: "Purple Magic",
    color: "bg-purple-400",
    image: "/labubu-images/dolls/labubu4.png",
    description: "Mystical and enchanting purple Labubu",
    type: "doll" as const,
  },
  {
    id: 5,
    name: "Green Forest",
    color: "bg-green-400",
    image: "/labubu-images/dolls/labubu5.png",
    description: "Natural and fresh green Labubu",
    type: "doll" as const,
  },
  {
    id: 6,
    name: "Orange Sunset",
    color: "bg-orange-400",
    image: "/labubu-images/dolls/labubu6.png",
    description: "Warm and vibrant orange Labubu",
    type: "doll" as const,
  },
] as const;

export const LABUBU_KEYCHAINS = [
  {
    id: 7,
    name: "Mini Pink",
    color: "bg-pink-300",
    image: "/labubu-images/keychains/labubu-keychain1.png",
    description: "Tiny pink Labubu keychain",
    type: "keychain" as const,
  },
  {
    id: 8,
    name: "Mini Blue",
    color: "bg-blue-300",
    image: "/labubu-images/keychains/labubu-keychain2.png",
    description: "Tiny blue Labubu keychain",
    type: "keychain" as const,
  },
  {
    id: 9,
    name: "Mini Yellow",
    color: "bg-yellow-300",
    image: "/labubu-images/keychains/labubu-keychain3.png",
    description: "Tiny yellow Labubu keychain",
    type: "keychain" as const,
  },
  {
    id: 10,
    name: "Mini Purple",
    color: "bg-purple-300",
    image: "/labubu-images/keychains/labubu-keychain4.png",
    description: "Tiny purple Labubu keychain",
    type: "keychain" as const,
  },
  {
    id: 11,
    name: "Mini Green",
    color: "bg-green-300",
    image: "/labubu-images/keychains/labubu-keychain5.png",
    description: "Tiny green Labubu keychain",
    type: "keychain" as const,
  },
  {
    id: 12,
    name: "Mini Orange",
    color: "bg-orange-300",
    image: "/labubu-images/keychains/labubu-keychain6.png",
    description: "Tiny orange Labubu keychain",
    type: "keychain" as const,
  },
] as const;

export const LABUBU_OPTIONS = [...LABUBU_DOLLS, ...LABUBU_KEYCHAINS] as const;

export type LabubuOption = (typeof LABUBU_OPTIONS)[number];

// Helper function to get Labubu image full URL
export function getLabubuImageUrl(labubu_id: number): string {
  const labubu = LABUBU_OPTIONS.find((l) => l.id === labubu_id);
  if (!labubu) {
    throw new Error(`Labubu with ID ${labubu_id} not found`);
  }

  return getPublicUrl(labubu.image);
}

// Get public URL for any asset - works on Vercel and locally
export function getPublicUrl(path: string): string {
  // Priority 1: Explicit public URL from environment
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
  }

  // Priority 2: Vercel deployment URL
  // if (process.env.VERCEL_URL) {
  //   return `https://${process.env.VERCEL_URL}${path}`;
  // }
  if (process.env.VERCEL_URL) {
    return `https://labubufy.vercel.app${path}`;
  }

  // Priority 3: For development, use CDN if available
  if (process.env.NEXT_PUBLIC_LABUBU_BASE_URL) {
    const filename = path.split("/").pop();
    return `${process.env.NEXT_PUBLIC_LABUBU_BASE_URL}/${filename}`;
  }

  // Priority 4: GitHub raw URLs for development (accessible to Replicate)
  if (path.includes("labubu") && process.env.NODE_ENV === "development") {
    const filename = path.split("/").pop();
    return `https://raw.githubusercontent.com/marydotdev/labubufy/main/public/labubu-images/${filename}`;
  }

  // Final fallback - this will fail for Replicate but works for local preview
  return `http://localhost:3000${path}`;
}

// Helper function to get Labubu name
export function getLabubuName(labubu_id: number): string {
  const labubu = LABUBU_OPTIONS.find((l) => l.id === labubu_id);
  return labubu?.name || "Classic Pink";
}

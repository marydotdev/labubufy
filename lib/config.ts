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

// Nano Banana AI configuration
export const AI_CONFIG = {
  MODEL: "google/nano-banana",
  // Alternative preview version: "google/gemini-2-5-flash-image-preview"
  PROMPT_TEMPLATE:
    "Create a photo of the person holding this Labubu doll. Make it look natural and realistic, maintaining the person's appearance exactly as shown.",
  MAX_TOKENS: 1290, // Based on Google's pricing info
  QUALITY: "high",
} as const;

// Labubu character definitions
export const LABUBU_DOLLS = [
  {
    id: 1,
    name: "I FOUND YOU",
    color: "bg-pink-400",
    image: "/labubu-images/dolls/labubu1.png",
    description: "I FOUND YOU Labubu",
    type: "doll" as const,
  },
  {
    id: 2,
    name: "FALL IN WILD",
    color: "bg-blue-400",
    image: "/labubu-images/dolls/labubu2.png",
    description: "FALL IN WILD Labubu",
    type: "doll" as const,
  },
  {
    id: 3,
    name: "FLIP WITH ME",
    color: "bg-yellow-400",
    image: "/labubu-images/dolls/labubu3.png",
    description: "FLIP WITH ME Labubu",
    type: "doll" as const,
  },
  {
    id: 4,
    name: "BEST OF LUCK",
    color: "bg-purple-400",
    image: "/labubu-images/dolls/labubu4.png",
    description: "BEST OF LUCK Labubu",
    type: "doll" as const,
  },
  {
    id: 5,
    name: "TIME TO CHILL",
    color: "bg-green-400",
    image: "/labubu-images/dolls/labubu5.png",
    description: "TIME TO CHILL Labubu",
    type: "doll" as const,
  },
  {
    id: 6,
    name: "DRESS BE LATTE",
    color: "bg-orange-400",
    image: "/labubu-images/dolls/labubu6.png",
    description: "DRESS BE LATTE Labubu",
    type: "doll" as const,
  },
] as const;

export const LABUBU_KEYCHAINS = [
  {
    id: 7,
    name: "EXCITING MACARON",
    color: "bg-pink-300",
    image: "/labubu-images/keychains/labubu-keychain1.png",
    description: "EXCITING MACARON Labubu keychain",
    type: "keychain" as const,
  },
  {
    id: 8,
    name: "HAVE A SEAT pink",
    color: "bg-blue-300",
    image: "/labubu-images/keychains/labubu-keychain2.png",
    description: "HAVE A SEAT Labubu keychain",
    type: "keychain" as const,
  },
  {
    id: 9,
    name: "HAVE A SEAT teal",
    color: "bg-yellow-300",
    image: "/labubu-images/keychains/labubu-keychain3.png",
    description: "HAVE A SEAT teal Labubu keychain",
    type: "keychain" as const,
  },
  {
    id: 10,
    name: "HAVE A SEAT lavender",
    color: "bg-purple-300",
    image: "/labubu-images/keychains/labubu-keychain4.png",
    description: "HAVE A SEAT lavender Labubu keychain",
    type: "keychain" as const,
  },
  {
    id: 11,
    name: "HAVE A SEAT rose",
    color: "bg-green-300",
    image: "/labubu-images/keychains/labubu-keychain5.png",
    description: "HAVE A SEAT rose Labubu keychain",
    type: "keychain" as const,
  },
  {
    id: 12,
    name: "HAVE A SEAT gray",
    color: "bg-orange-300",
    image: "/labubu-images/keychains/labubu-keychain6.png",
    description: "HAVE A SEAT gray Labubu keychain",
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
    // Use the full path structure including dolls/ or keychains/ subdirectories
    return `https://raw.githubusercontent.com/marydotdev/labubufy/main/public${path}`;
  }

  // Final fallback - this will fail for Replicate but works for local preview
  return `http://localhost:3000${path}`;
}

// Helper function to get Labubu name
export function getLabubuName(labubu_id: number): string {
  const labubu = LABUBU_OPTIONS.find((l) => l.id === labubu_id);
  return labubu?.name || "Classic Pink";
}

// Enhanced prompting strategy for different Labubu types
export function generatePrompt(labubuId: number): string {
  const labubu = LABUBU_OPTIONS.find(l => l.id === labubuId);

  if (labubu?.type === 'keychain') {
    return `"Show the person holding the Labubu keychain naturally in their hands, keeping their exact appearance, pose, and background unchanged. The keychain should appear as if it was always part of the original photo."`;
  } else {
    return `"Show the person holding the Labubu doll naturally in their hands, keeping their exact appearance, pose, and background unchanged. The doll should appear as if it was always part of the original photo."`;
  }
}

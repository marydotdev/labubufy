// Application configuration constants
export const CONFIG = {
  // File upload limits
  MAX_FILE_SIZE: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'), // 10MB
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  MIN_RESOLUTION: 640,

  // Storage limits
  MAX_HISTORY_ITEMS: parseInt(process.env.NEXT_PUBLIC_MAX_HISTORY_ITEMS || '50'),
  MAX_HISTORY_SIZE: parseInt(process.env.NEXT_PUBLIC_MAX_HISTORY_SIZE || '104857600'), // 100MB
  STORAGE_KEY_PREFIX: 'labubufy_',

  // Generation settings
  GENERATION_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  POLLING_INTERVAL: 2000, // 2 seconds

  // Image output settings
  OUTPUT_QUALITY: 0.85,
  OUTPUT_FORMAT: 'image/jpeg',
  MIN_OUTPUT_SIZE: 1080,
} as const;

// Labubu character definitions
export const LABUBU_OPTIONS = [
  {
    id: 1,
    name: "Classic Pink",
    color: "bg-pink-400",
    image: "/labubu-images/pink-labubu.png",
    description: "Sweet and adorable pink Labubu",
  },
  {
    id: 2,
    name: "Blue Dreamer",
    color: "bg-blue-400", 
    image: "/labubu-images/blue-labubu.png",
    description: "Calm and dreamy blue Labubu",
  },
  {
    id: 3,
    name: "Yellow Sunshine",
    color: "bg-yellow-400",
    image: "/labubu-images/yellow-labubu.png", 
    description: "Bright and cheerful yellow Labubu",
  },
  {
    id: 4,
    name: "Purple Magic",
    color: "bg-purple-400",
    image: "/labubu-images/purple-labubu.png",
    description: "Mystical and enchanting purple Labubu",
  },
  {
    id: 5,
    name: "Green Forest",
    color: "bg-green-400",
    image: "/labubu-images/green-labubu.png",
    description: "Natural and fresh green Labubu",
  },
  {
    id: 6,
    name: "Orange Sunset",
    color: "bg-orange-400",
    image: "/labubu-images/orange-labubu.png",
    description: "Warm and vibrant orange Labubu",
  },
] as const;

export type LabubuOption = typeof LABUBU_OPTIONS[number];
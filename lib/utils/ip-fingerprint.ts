// lib/utils/ip-fingerprint.ts
// Utilities for getting client IP and browser fingerprint

/**
 * Get client IP address from NextRequest
 * Handles various proxy headers (Vercel, Cloudflare, etc.)
 * This is critical for preventing abuse via incognito windows
 */
export function getClientIP(
  request: Request | { headers: Headers }
): string | null {
  // Try various headers that might contain the real IP
  const headers = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip", // Cloudflare
    "x-client-ip",
    "x-forwarded",
    "forwarded-for",
    "forwarded",
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(",")[0].trim();
      if (ip && ip !== "unknown" && ip !== "::1") {
        // Normalize localhost IPv6 to IPv4 for consistency
        if (ip === "::1" || ip === "::ffff:127.0.0.1") {
          return "127.0.0.1";
        }
        return ip;
      }
    }
  }

  // Fallback: try to get IP from request object if available
  // This handles cases where headers aren't set (like in development)
  if ("ip" in request && request.ip) {
    return request.ip;
  }

  return null;
}

/**
 * Generate a simple browser fingerprint on the client side
 * This is a basic implementation - can be enhanced with more features
 */
export function generateBrowserFingerprint(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const components: string[] = [];

  // User agent
  if (navigator.userAgent) {
    components.push(navigator.userAgent);
  }

  // Language
  if (navigator.language) {
    components.push(navigator.language);
  }

  // Screen resolution
  if (screen.width && screen.height) {
    components.push(`${screen.width}x${screen.height}`);
  }

  // Color depth
  if (screen.colorDepth) {
    components.push(screen.colorDepth.toString());
  }

  // Timezone
  try {
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch (e) {
    // Ignore
  }

  // Platform
  if (navigator.platform) {
    components.push(navigator.platform);
  }

  // Hardware concurrency
  if (navigator.hardwareConcurrency) {
    components.push(navigator.hardwareConcurrency.toString());
  }

  // Combine and hash (simple hash)
  const combined = components.join("|");

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

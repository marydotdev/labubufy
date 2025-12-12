// lib/monitoring/index.ts
// Monitoring and error tracking setup
export function setupMonitoring() {
  // Only run on client side
  if (typeof window === 'undefined') return;

  // Vercel Analytics (if available)
  // Note: @vercel/analytics is optional and not installed by default
  // Uncomment and install if you want to use Vercel Analytics
  // if (process.env.NEXT_PUBLIC_VERCEL_ENV) {
  //   // Dynamic import to avoid SSR issues
  //   import('@vercel/analytics').then(({ inject }) => {
  //     inject();
  //   }).catch(() => {
  //     // Analytics not available, that's okay
  //     console.log('Vercel Analytics not available');
  //   });
  // }

  // Global error handler for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(event.reason);

    // Prevent default browser error logging in some cases
    // event.preventDefault();
  });

  // Global error handler for uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);

    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(event.error);
  });
}

// Call setup on module load (client-side only)
if (typeof window !== 'undefined') {
  setupMonitoring();
}


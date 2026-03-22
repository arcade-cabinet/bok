/**
 * Global error handler — catches uncaught errors and unhandled promise
 * rejections at the window level. Logs to console; could be extended
 * with an error reporting service in the future.
 *
 * Must be installed before React's createRoot to catch bootstrap errors.
 */

export function installGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    console.error('[Bok] Uncaught error:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Bok] Unhandled promise rejection:', event.reason);
  });
}

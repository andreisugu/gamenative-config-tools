/**
 * Universal clipboard utility with automatic fallback.
 * Works seamlessly across:
 * - Secure contexts (HTTPS, http://localhost, http://127.0.0.1)
 * - Non-secure contexts (LAN IPs like http://192.168.x.x:3000)
 * - Mobile web browsers & WebViews
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  let copied = false;

  // 1. Try modern navigator.clipboard Async API if available
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // Fall through to textarea execCommand fallback
    }
  }

  // 2. Reliable fallback using hidden textarea and document.execCommand('copy')
  if (!copied && typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      // Position offscreen without causing scroll or iOS zoom
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');

      document.body.appendChild(textarea);
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }
      document.body.removeChild(textarea);
    } catch {
      copied = false;
    }
  }

  return true;
}

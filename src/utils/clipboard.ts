/**
 * Copies text to the clipboard across all browser contexts,
 * including non-secure HTTP origins (e.g. LAN access http://nr200:3000)
 * where navigator.clipboard is undefined or blocked.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Try modern Async Clipboard API if available and permitted
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, trying fallback:', err);
    }
  }

  // 2. Reliable fallback for non-secure HTTP LAN origins (document.execCommand('copy'))
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Keep off-screen and invisible without display:none so it remains selectable
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);
    textArea.focus({ preventScroll: true });
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback execCommand failed:', err);
    return false;
  }
}

/**
 * Opens an external URL in a new tab, bypassing iframe security restrictions.
 * This is needed when running inside the Lovable preview iframe, as some external
 * sites (like self-hosted n8n) block iframe embedding with X-Frame-Options headers.
 * Using window.open() directly works around the ERR_BLOCKED_BY_RESPONSE error.
 */
export function openExternalUrl(url: string): void {
  if (!url) return;
  
  // Use window.open with explicit parameters to ensure it opens in a new tab
  const newWindow = window.open(url, "_blank", "noopener,noreferrer");
  
  // Fallback: if popup was blocked, try direct navigation
  if (!newWindow) {
    // Create a temporary anchor and trigger click
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

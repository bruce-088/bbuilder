/**
 * Opens an external URL in a new tab, bypassing iframe security restrictions.
 * This is needed when running inside the Lovable preview iframe, as some external
 * sites (like self-hosted n8n) block iframe embedding with X-Frame-Options headers.
 * 
 * Uses anchor element click as the primary method since it provides cleaner
 * navigation context compared to window.open(), which some servers check.
 */
export function openExternalUrl(url: string): void {
  if (!url) return;
  
  // Ensure URL has a protocol
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Primary method: Create an anchor element and click it
  // This provides a cleaner browsing context than window.open()
  const link = document.createElement("a");
  link.href = normalizedUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  
  // Append, click, and remove - this triggers proper navigation
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

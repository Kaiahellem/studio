// Validates the `next` parameter used to return users to where they were going after login.
// Only same-site relative paths are allowed, so a login link can never redirect to another host.
export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;
  if (!value.startsWith("/")) return fallback;
  // "//host" and "/\host" are protocol-relative URLs in browsers.
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Control characters (including tabs and newlines browsers strip) could hide a second slash.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

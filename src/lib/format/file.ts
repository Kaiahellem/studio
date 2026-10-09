const sizeFormat = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });

// "800 kB", "12,5 MB". Binary steps, so the 50 MiB upload limit reads as "50 MB".
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["kB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${sizeFormat.format(value)} ${units[unit]}`;
}

// A storage-safe version of a file name: lowercase ASCII, dashes, original extension kept.
export function safeFileName(fullName: string): string {
  // Only the last path segment; browsers may send "C:\\fakepath\\x" or a relative path.
  const name = fullName.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1) : "";
  const clean = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/æ/gi, "ae")
      .replace(/ø/gi, "o")
      .replace(/å/gi, "a")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const safeBase = clean(base).slice(0, 80) || "fil";
  const safeExt = clean(ext).slice(0, 10);
  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

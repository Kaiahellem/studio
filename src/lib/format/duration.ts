// Reads time as people type it: "1,5" or "1.5" (hours), "1:30", "90", "90 min", "2 t", "2 t 15 min".
// A bare number up to 8 is hours; above that it is minutes. Returns whole minutes, or null.
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return null;

  const clock = text.match(/^(\d{1,2}):([0-5]\d)$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  const parts = text.match(/^(?:(\d+(?:[.,]\d+)?) ?(?:t|timer|time|h)\b)? ?(?:(\d+) ?(?:m|min|minutter)\b)?$/);
  if (parts && (parts[1] || parts[2])) {
    const minutes = Math.round(Number((parts[1] ?? "0").replace(",", ".")) * 60) + Number(parts[2] ?? 0);
    return minutes > 0 ? minutes : null;
  }

  const bare = text.match(/^\d+(?:[.,]\d+)?$/);
  if (bare) {
    const value = Number(text.replace(",", "."));
    const minutes = value <= 8 ? Math.round(value * 60) : Math.round(value);
    return minutes > 0 ? minutes : null;
  }
  return null;
}

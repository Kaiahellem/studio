export const TIME_ZONE = "Europe/Oslo";

const dateFormat = new Intl.DateTimeFormat("nb-NO", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("nb-NO", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const monthFormat = new Intl.DateTimeFormat("nb-NO", {
  timeZone: TIME_ZONE,
  month: "long",
  year: "numeric",
});

// Postgres `date` values ("2026-10-09") have no time zone; read them as noon UTC so the
// calendar day is the same in Oslo.
function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00Z`);
  return new Date(value);
}

// "9. oktober 2026"
export function formatDate(value: string | Date): string {
  return dateFormat.format(toDate(value));
}

// "9. oktober 2026 kl. 14:05"
export function formatDateTime(value: string | Date): string {
  return dateTimeFormat.format(toDate(value));
}

// "oktober 2026"
export function formatMonth(value: string | Date): string {
  return monthFormat.format(toDate(value));
}

// Today's calendar date in Oslo as "YYYY-MM-DD".
export function todayInOslo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

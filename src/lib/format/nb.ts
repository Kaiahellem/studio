// Norwegian formatting (DESIGN.md, "Norwegian users"). Everything goes through Intl with
// locale nb-NO and time zone Europe/Oslo. One module, so formats stay consistent everywhere.

export const LOCALE = "nb-NO";
export const TIME_ZONE = "Europe/Oslo";

// Narrow no-break space, as Intl uses for nb-NO thousands. Used where we build strings ourselves.
const NBSP = " ";

// ---------------------------------------------------------------------------
// Dates and times
// ---------------------------------------------------------------------------

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...options });

const dateText = fmt({ day: "numeric", month: "long", year: "numeric" });
const dateTable = fmt({ day: "2-digit", month: "2-digit", year: "numeric" });
const dateShort = fmt({ day: "numeric", month: "short" });
const dateShortYear = fmt({ day: "numeric", month: "short", year: "numeric" });
const monthText = fmt({ month: "long", year: "numeric" });
const timeParts = fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const weekday = fmt({ weekday: "long" });
const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

// Postgres `date` values ("2026-10-09") have no time zone; read them as noon UTC so the
// calendar day is the same in Oslo.
function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00Z`);
  return new Date(value);
}

/** "9. oktober 2026" – dates in running text. */
export function formatDate(value: string | Date): string {
  return dateText.format(toDate(value));
}

/** "09.10.2026" – dates in tables. */
export function formatDateTable(value: string | Date): string {
  return dateTable.format(toDate(value));
}

/** "9. okt." – short dates; adds the year when it isn't this year. */
export function formatDateShort(value: string | Date, now = new Date()): string {
  const date = toDate(value);
  const sameYear = isoDay.format(date).slice(0, 4) === isoDay.format(now).slice(0, 4);
  return (sameYear ? dateShort : dateShortYear).format(date);
}

/** "oktober 2026" */
export function formatMonth(value: string | Date): string {
  return monthText.format(toDate(value));
}

function hourMinute(value: string | Date): [string, string] {
  const parts = timeParts.formatToParts(toDate(value));
  return [parts.find((p) => p.type === "hour")!.value, parts.find((p) => p.type === "minute")!.value];
}

/** "kl. 14.30" – time in running text (Norwegian uses a full stop). */
export function formatTime(value: string | Date): string {
  const [h, m] = hourMinute(value);
  return `kl.${NBSP}${h}.${m}`;
}

/** "14:30" – time in tables. */
export function formatTimeTable(value: string | Date): string {
  const [h, m] = hourMinute(value);
  return `${h}:${m}`;
}

/** "9. oktober 2026 kl. 14.30" */
export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)} ${formatTime(value)}`;
}

/** Today's calendar date in Oslo as "YYYY-MM-DD". */
export function todayInOslo(now = new Date()): string {
  return isoDay.format(now);
}

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: "always" });

/**
 * "nå nettopp", "for 5 minutter siden", "for 3 timer siden", "i går kl. 14.30",
 * "mandag kl. 09.15" within the last week, then "9. okt.".
 */
export function formatRelative(value: string | Date, now = new Date()): string {
  const date = toDate(value);
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "nå nettopp";
  if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), "minute");

  const day = (d: Date) => new Date(`${isoDay.format(d)}T12:00:00Z`).getTime();
  const daysAgo = Math.round((day(now) - day(date)) / 86_400_000);
  if (daysAgo === 0) return relative.format(-Math.floor(seconds / 3600), "hour");
  if (daysAgo === 1) return `i går ${formatTime(date)}`;
  if (daysAgo < 7) return `${weekday.format(date)} ${formatTime(date)}`;
  return formatDateShort(date, now);
}

/** ISO week number (weeks start on Monday), as Norwegian businesses plan by it. */
export function weekNumber(value: string | Date): number {
  const [y, m, d] = isoDay.format(toDate(value)).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** "uke 42" */
export function formatWeek(value: string | Date): string {
  return `uke ${weekNumber(value)}`;
}

// ---------------------------------------------------------------------------
// Numbers and money
// ---------------------------------------------------------------------------

const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const nok = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "NOK", currencyDisplay: "narrowSymbol", minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** "12 500", "2,5" */
export function formatNumber(value: number): string {
  return number.format(value);
}

/** Money is stored as integer øre and shown as "1 490 kr". */
export function formatOre(ore: number): string {
  if (!Number.isInteger(ore)) throw new TypeError(`Expected integer øre, got ${ore}`);
  return nok.format(ore / 100);
}

export function kronerToOre(kroner: number): number {
  return Math.round(kroner * 100);
}

/** Durations: "45 min", "1 t", "1 t 30 min". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
}

/** Hours as a number: "2,5 timer", "1 time". */
export function formatHours(minutes: number): string {
  const hours = Math.round((minutes / 60) * 100) / 100;
  return `${number.format(hours)}${NBSP}${hours === 1 ? "time" : "timer"}`;
}

// ---------------------------------------------------------------------------
// Phone numbers, organisation numbers, postnummer
// ---------------------------------------------------------------------------

/**
 * Normalises a phone number typed with or without spaces and +47 / 0047.
 * Returns "+4741234567" for Norwegian numbers, the cleaned input for other countries,
 * or null if it isn't a phone number.
 */
export function parsePhone(input: string): string | null {
  const cleaned = input.trim().replace(/[\s().-]/g, "");
  if (/^(\+47|0047)?\d{8}$/.test(cleaned)) return `+47${cleaned.slice(-8)}`;
  if (/^(\+|00)\d{7,15}$/.test(cleaned)) return cleaned.replace(/^00/, "+");
  return null;
}

/**
 * "412 34 567" for Norwegian mobile numbers (4, 8, 9), "22 12 34 56" for landlines;
 * "+47 …" when `withCountryCode` is set. Other countries are shown as typed.
 */
export function formatPhone(input: string, withCountryCode = false): string {
  const phone = parsePhone(input);
  if (!phone) return input;
  if (!phone.startsWith("+47")) return phone;
  const n = phone.slice(3);
  const local = /^[489]/.test(n) ? `${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5)}` : `${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)} ${n.slice(6)}`;
  return withCountryCode ? `+47 ${local}` : local;
}

/** For `href`: "tel:+4741234567". */
export function telHref(input: string): string | null {
  const phone = parsePhone(input);
  return phone ? `tel:${phone}` : null;
}

/** Organisation numbers: 9 digits with the modulus 11 check digit (Brønnøysundregistrene). */
export function isValidOrgNumber(input: string): boolean {
  const digits = input.replace(/\s/g, "");
  if (!/^\d{9}$/.test(digits)) return false;
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const remainder = sum % 11;
  const check = remainder === 0 ? 0 : 11 - remainder;
  return check !== 10 && check === Number(digits[8]);
}

/** "123 456 789" */
export function formatOrgNumber(input: string): string {
  const digits = input.replace(/\s/g, "");
  return /^\d{9}$/.test(digits) ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : input;
}

export function isValidPostnummer(input: string): boolean {
  return /^\d{4}$/.test(input.trim());
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

const collator = new Intl.Collator("nb");

/** Norwegian sort order: Æ, Ø and Å after Z. */
export function compareNb(a: string, b: string): number {
  return collator.compare(a, b);
}

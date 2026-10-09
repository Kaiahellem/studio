const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Money is stored as integer øre and shown as e.g. "1 490 kr".
export function formatOre(ore: number): string {
  if (!Number.isInteger(ore)) throw new TypeError(`Expected integer øre, got ${ore}`);
  return nok.format(ore / 100);
}

export function kronerToOre(kroner: number): number {
  return Math.round(kroner * 100);
}

// Minutes as "1 t 30 min", "45 min", "2 t".
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
}

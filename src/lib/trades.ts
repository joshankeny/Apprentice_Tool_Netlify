export const TRADES = {
  general: "General",
  wire: "Wire",
  line: "Line",
  meter: "Meter"
} as const;

export type Trade = keyof typeof TRADES;

export function isTrade(value: unknown): value is Trade {
  return typeof value === "string" && Object.hasOwn(TRADES, value);
}

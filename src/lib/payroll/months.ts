/**
 * Months as `2026-06`.
 *
 * Everything here is string and integer arithmetic on purpose. A month has no time
 * zone, and going through `Date` would let the browser's offset move the first of June
 * into May for anybody west of Greenwich.
 */

const pad = (value: number) => String(value).padStart(2, '0');

/** Months since year 0, so two months subtract into a count. */
export function monthIndex(month: string): number {
  const [year, monthOfYear] = month.split('-').map(Number);
  return year * 12 + (monthOfYear - 1);
}

export function addMonths(month: string, count: number): string {
  const index = monthIndex(month) + count;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

export const yearOf = (month: string) => Number(month.slice(0, 4));
export const monthNumberOf = (month: string) => Number(month.slice(5, 7));
export const makeMonth = (year: number, monthOfYear: number) => `${year}-${pad(monthOfYear)}`;

/** Every month from `start` up to, and not including, `end`. */
export function monthsBetween(start: string, end: string): string[] {
  const count = Math.max(0, monthIndex(end) - monthIndex(start));
  return Array.from({ length: count }, (_unused, offset) => addMonths(start, offset));
}

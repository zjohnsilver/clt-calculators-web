import { divideDown, divideHalfUp, RATE_SCALE } from '@/lib/payroll/cents';

/** A progressive INSS band: `rate` applies to the part of the base up to `upTo`. */
type InssBand = { upTo: number; rate: number };

/** One row of the IRRF table. `upTo` is null for the last band. */
type IrrfBand = { upTo: number | null; rate: number; deduction: number };

/**
 * The 2026 reduction (Lei 15.270/2025). Up to `fullUntil` the tax is reduced by up to
 * `fullAmount`, which zeroes it; up to `phaseUntil` it is reduced by
 * `phaseConstant - phaseRate * gross`; above that there is none.
 */
type IrrfReduction = {
  fullUntil: number;
  fullAmount: number;
  phaseUntil: number;
  phaseConstant: number;
  phaseRate: number;
};

/** The INSS and IRRF parameters of ONE year. Amounts in cents, rates in millionths. */
export type TaxTable = {
  year: number;
  inssBands: readonly InssBand[];
  irrfBands: readonly IrrfBand[];
  simplifiedDeduction: number;
  dependentDeduction: number;
  irrfReduction: IrrfReduction;
};

const TABLE_2026: TaxTable = {
  year: 2026,
  // Portaria Interministerial MPS/MF 13/2026.
  inssBands: [
    { upTo: 162_100, rate: 75_000 },
    { upTo: 290_284, rate: 90_000 },
    { upTo: 435_427, rate: 120_000 },
    { upTo: 847_555, rate: 140_000 },
  ],
  // Receita Federal, monthly table in force since May 2025, kept by Lei 15.270/2025.
  irrfBands: [
    { upTo: 242_880, rate: 0, deduction: 0 },
    { upTo: 282_665, rate: 75_000, deduction: 18_216 },
    { upTo: 375_105, rate: 150_000, deduction: 39_416 },
    { upTo: 466_468, rate: 225_000, deduction: 67_549 },
    { upTo: null, rate: 275_000, deduction: 90_873 },
  ],
  simplifiedDeduction: 60_720,
  dependentDeduction: 18_959,
  irrfReduction: {
    fullUntil: 500_000,
    fullAmount: 31_289,
    phaseUntil: 735_000,
    phaseConstant: 97_862,
    phaseRate: 133_145,
  },
};

/**
 * JANUARY CHORE: the INSS bands (the ceiling moves with the minimum wage) and the IRRF
 * table are republished every year. Add the new year's table here from the official
 * publications; a calculation in a year with no table is refused rather than made with
 * last year's numbers.
 */
const TABLES: readonly TaxTable[] = [TABLE_2026];

export class NoTaxTableError extends Error {
  constructor(readonly year: number) {
    super(`No tax table for ${year}`);
  }
}

export function taxTableFor(year: number): TaxTable {
  const table = TABLES.find((candidate) => candidate.year === year);
  if (!table) throw new NoTaxTableError(year);
  return table;
}

export const hasTaxTable = (year: number) => TABLES.some((table) => table.year === year);

/** The years a calculation can fall in, for the form's year pickers. */
export const TAX_TABLE_YEARS = TABLES.map((table) => table.year);

/**
 * INSS on `base`. Each band's contribution is TRUNCATED to the cent: it is the only
 * way the ceiling comes out as 988,07, which is what payslips show (the published
 * 988,09 is a rounded figure).
 */
export function inss(table: TaxTable, base: number): number {
  let contribution = 0;
  let lower = 0;
  for (const band of table.inssBands) {
    const portion = Math.min(base, band.upTo) - lower;
    if (portion <= 0) break;
    contribution += divideDown(portion * band.rate, RATE_SCALE);
    lower = band.upTo;
  }
  return contribution;
}

function irrfReduction(reduction: IrrfReduction, gross: number): number {
  if (gross <= reduction.fullUntil) return reduction.fullAmount;
  if (gross > reduction.phaseUntil) return 0;
  const scaled = reduction.phaseConstant * RATE_SCALE - reduction.phaseRate * gross;
  return scaled <= 0 ? 0 : divideHalfUp(scaled, RATE_SCALE);
}

/**
 * IRRF on `gross`, deducting INSS and dependents or the simplified deduction. Whichever
 * deduction is larger is the one used; the simplified one replaces the legal ones,
 * dependents included, it does not add to them.
 */
export function irrf(table: TaxTable, gross: number, inssPaid: number, dependents: number): number {
  const deductions = Math.max(inssPaid + table.dependentDeduction * dependents, table.simplifiedDeduction);
  const base = Math.max(0, gross - deductions);
  const band = table.irrfBands.find((candidate) => candidate.upTo === null || base <= candidate.upTo)!;
  const scaled = base * band.rate - band.deduction * RATE_SCALE;
  const tax = scaled <= 0 ? 0 : divideHalfUp(scaled, RATE_SCALE);
  return Math.max(0, tax - irrfReduction(table.irrfReduction, gross));
}

import { describe, expect, it } from 'vitest';

import { splitEvenly, sum } from '@/lib/payroll/cents';
import {
  calculateSalaryAdjustment,
  FirstPaidBeforeEffectiveError,
  type SalaryAdjustmentInput,
} from '@/lib/payroll/salary-adjustment';
import { inss, irrf, NoTaxTableError, taxTableFor } from '@/lib/payroll/tax-tables';

/** Every figure here is made up: no test carries a real person's payslip. */
function calculate(overrides: Partial<SalaryAdjustmentInput> = {}) {
  const salary = overrides.salary ?? 900_000;
  return calculateSalaryAdjustment({
    salary,
    baseSalary: salary,
    rate: 500,
    effectiveMonth: '2026-05',
    firstPaidMonth: '2026-09',
    installments: 2,
    dependents: 0,
    vacationDays: 0,
    foodDiscountBefore: { kind: 'fixed', amount: 0 },
    foodDiscountAfter: { kind: 'fixed', amount: 0 },
    otherDiscounts: [],
    ...overrides,
  });
}

describe('the 2026 tables', () => {
  const table = taxTableFor(2026);

  it.each([
    [150_000, 11_250, 0, 0],
    [162_100, 12_157, 0, 0],
    [250_000, 20_068, 0, 0],
    [290_284, 23_693, 0, 0],
    [400_000, 36_858, 0, 0],
    [435_427, 41_110, 0, 0],
    [600_000, 64_150, 38_511, 28_083],
    [847_555, 98_807, 115_033, 104_605],
    [900_000, 98_807, 129_455, 119_028],
    [2_000_000, 98_807, 431_955, 421_528],
  ])('a salary of %i cents pays INSS %i and IRRF %i, or %i with two dependents', (base, inssPaid, alone, withTwo) => {
    expect(inss(table, base)).toBe(inssPaid);
    expect(irrf(table, base, inssPaid, 0)).toBe(alone);
    expect(irrf(table, base, inssPaid, 2)).toBe(withTwo);
  });

  it('refuses a year it has no table for rather than guessing', () => {
    expect(() => taxTableFor(2027)).toThrow(NoTaxTableError);
  });
});

describe('the monthly payroll', () => {
  it('above the INSS ceiling the raise only pays more IRRF', () => {
    const result = calculate({ otherDiscounts: [{ name: 'Plano', amount: 1_000 }] });

    expect(result.salaryAfter).toBe(945_000);
    expect(result.before).toMatchObject({ inss: 98_807, irrf: 129_455, net: 670_738, fgts: 72_000 });
    expect(result.after).toMatchObject({ inss: 98_807, irrf: 141_830, net: 703_363, fgts: 75_600 });
    expect(result.netRaise).toBe(32_625);
    expect(result.discountChange).toBe(0);
  });

  it('dependents lower the IRRF of both months', () => {
    const result = calculate({ dependents: 2, otherDiscounts: [{ name: 'Plano', amount: 1_000 }] });

    expect(result.before).toMatchObject({ irrf: 119_028, net: 681_165 });
    expect(result.after).toMatchObject({ irrf: 131_403, net: 713_790 });
  });

  it('below the ceiling the raise pays more INSS too', () => {
    const result = calculate({ salary: 600_000, rate: 725, effectiveMonth: '2026-03', firstPaidMonth: '2026-08' });

    expect(result.salaryAfter).toBe(643_500);
    expect(result.before).toMatchObject({ inss: 64_150, irrf: 38_511, net: 497_339 });
    expect(result.after).toMatchObject({ inss: 70_240, irrf: 54_591, net: 518_669 });
  });

  it('the rate applies to the base salary, which may not be the one paid today', () => {
    const result = calculate({ salary: 900_000, baseSalary: 800_000 });

    expect(result.salaryAfter).toBe(940_000);
    expect(result.arrears.monthlyDifference).toBe(40_000);
  });

  it('a food allowance discount that changes with the adjustment is not part of the raise', () => {
    const result = calculate({
      baseSalary: 800_000,
      foodDiscountBefore: { kind: 'fixed', amount: 200 },
      foodDiscountAfter: { kind: 'percent', percent: 500, allowance: 90_000 },
    });

    expect(result.before).toMatchObject({ foodDiscount: 200, net: 671_538 });
    expect(result.after).toMatchObject({ foodDiscount: 4_500, irrf: 140_455, net: 696_238 });
    expect(result.netRaise).toBe(29_000);
    expect(result.discountChange).toBe(4_300);
    expect(result.before.net + result.netRaise - result.discountChange).toBe(result.after.net);
  });
});

describe('the arrears', () => {
  it('a first payroll before the effective month is refused', () => {
    expect(() => calculate({ firstPaidMonth: '2026-04' })).toThrow(FirstPaidBeforeEffectiveError);
  });

  it('an instalment in a year without a table is refused', () => {
    expect(() => calculate({ effectiveMonth: '2026-09', firstPaidMonth: '2026-12' })).toThrow(NoTaxTableError);
  });

  it('paid on time there are none', () => {
    const { arrears } = calculate({ effectiveMonth: '2026-09', firstPaidMonth: '2026-09', installments: 1 });

    expect(arrears.months).toEqual([]);
    expect(arrears).toMatchObject({ gross: 0, inss: 0, irrf: 0, net: 0, fgts: 0, installments: [] });
  });

  it('above the ceiling they pay IRRF, no INSS, and earn FGTS', () => {
    const { arrears } = calculate();

    expect(arrears.months).toEqual(['2026-05', '2026-06', '2026-07', '2026-08']);
    expect(arrears).toMatchObject({
      monthlyDifference: 45_000,
      gross: 180_000,
      inss: 0,
      irrf: 49_500,
      net: 130_500,
      fgts: 14_400,
    });
    expect(arrears.installments).toMatchObject([
      { month: '2026-09', gross: 90_000, irrf: 24_750, net: 65_250 },
      { month: '2026-10', gross: 90_000, irrf: 24_750, net: 65_250 },
    ]);
  });

  it('below the ceiling they pay INSS for each original month', () => {
    // 3.000,00 → 3.300,00: both in the 12% band, so each month owes 36,00 more INSS.
    const { arrears } = calculate({ salary: 300_000, rate: 1_000 });

    expect(arrears).toMatchObject({ gross: 120_000, inss: 14_400, irrf: 0, net: 105_600, fgts: 9_600 });
    expect(arrears.installments).toMatchObject([
      { gross: 60_000, inss: 7_200, irrf: 0, net: 52_800 },
      { gross: 60_000, inss: 7_200, irrf: 0, net: 52_800 },
    ]);
  });

  it('an instalment is taxed by the brackets it crosses, not at the top rate', () => {
    const { arrears } = calculate({
      salary: 600_000,
      rate: 725,
      effectiveMonth: '2026-03',
      firstPaidMonth: '2026-08',
      installments: 3,
    });

    expect(arrears).toMatchObject({ gross: 217_500, inss: 30_450, irrf: 80_397, net: 106_653, fgts: 17_400 });
    expect(arrears.installments.map((installment) => installment.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(arrears.installments[0]).toMatchObject({ gross: 72_500, inss: 10_150, irrf: 26_799, net: 35_551 });
  });

  it('with a dependent and four instalments', () => {
    const { arrears } = calculate({ salary: 480_000, rate: 600, installments: 4, dependents: 1 });

    expect(arrears).toMatchObject({ gross: 115_200, inss: 16_128, irrf: 37_632, net: 61_440, fgts: 9_216 });
    expect(arrears.installments[3]).toMatchObject({
      month: '2026-12',
      gross: 28_800,
      inss: 4_032,
      irrf: 9_408,
      net: 15_360,
    });
  });

  it('the vacation days come as vacation, with a third on top and no IRRF', () => {
    // 400,00 a month for 4 months; 15 days of vacation are half a month: 200,00.
    const { arrears, after } = calculate({ baseSalary: 800_000, vacationDays: 15 });

    expect(arrears).toMatchObject({
      salaryDifference: 140_000,
      vacationDifference: 20_000,
      vacationThird: 6_667,
      gross: 166_667,
      inss: 0,
      irrf: 38_500,
      net: 128_167,
      fgts: 13_333,
    });
    expect(arrears.installments).toMatchObject([
      { salaryDifference: 70_000, vacationDifference: 10_000, vacationThird: 3_334, irrf: 19_250, net: 64_084 },
      { salaryDifference: 70_000, vacationDifference: 10_000, vacationThird: 3_333, irrf: 19_250, net: 64_083 },
    ]);
    expect(after.net + arrears.installments[0].net).toBe(764_822);
  });

  it('the instalments always add back to the totals', () => {
    const { arrears } = calculate({ salary: 123_457, rate: 333, installments: 3, vacationDays: 11 });

    expect(sum(arrears.installments.map((installment) => installment.gross))).toBe(arrears.gross);
    expect(sum(arrears.installments.map((installment) => installment.inss))).toBe(arrears.inss);
    expect(sum(arrears.installments.map((installment) => installment.net))).toBe(arrears.net);
  });
});

describe('splitEvenly', () => {
  it('gives the odd cents to the first share', () => {
    expect(splitEvenly(1_000, 3)).toEqual([334, 333, 333]);
  });

  it.each([
    [239_400, 2],
    [1_000, 3],
    [1, 4],
    [99_999, 12],
  ])('%i cents in %i shares add back to the total', (total, parts) => {
    const shares = splitEvenly(total, parts);

    expect(shares).toHaveLength(parts);
    expect(sum(shares)).toBe(total);
    expect(shares.every((share) => share >= 0)).toBe(true);
  });
});

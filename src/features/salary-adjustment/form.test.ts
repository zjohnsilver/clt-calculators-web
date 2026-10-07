import { describe, expect, it } from 'vitest';

import {
  adjustmentProblem,
  arrearsMonthCount,
  EMPTY_FORM,
  parsePercent,
  toEngineInput,
  type AdjustmentForm,
} from '@/features/salary-adjustment/form';

const FILLED: AdjustmentForm = {
  ...EMPTY_FORM,
  salary: 900_000,
  rate: '5',
  effectiveMonth: '2026-05',
  firstPaidMonth: '2026-09',
  installments: '2',
};

describe('parsePercent', () => {
  it.each([
    ['4,5', 450],
    ['4.5', 450],
    ['4,05', 405],
    ['100', 10_000],
    ['0', 0],
    [' 7 ', 700],
  ])('reads %s as %i hundredths', (text, hundredths) => {
    expect(parsePercent(text)).toBe(hundredths);
  });

  it.each(['', 'abc', '4,555', '100,01', '-1', '4,'])('refuses %j', (text) => {
    expect(parsePercent(text)).toBeNull();
  });
});

describe('adjustmentProblem', () => {
  it('a filled form has none', () => {
    expect(adjustmentProblem(FILLED)).toBeNull();
  });

  it.each([
    [{ salary: null }, 'incomplete'],
    [{ rate: '' }, 'incomplete'],
    [{ baseSalary: null, baseSalaryTyped: true }, 'incomplete'],
    [{ rate: '0' }, 'rate'],
    [{ rate: '4,555' }, 'rate'],
    [{ effectiveMonth: '' }, 'incomplete'],
    [{ firstPaidMonth: '2026-04' }, 'order'],
    [{ installments: '0' }, 'installments'],
    [{ installments: '13' }, 'installments'],
    [{ installments: '5' }, 'beyondTables'],
    [{ vacationDays: '121' }, 'vacationDays'],
    [{ foodBefore: { ...EMPTY_FORM.foodBefore, percent: '101' } }, 'foodPercent'],
  ] as const)('%j is %s', (change, problem) => {
    expect(adjustmentProblem({ ...FILLED, ...change })).toBe(problem);
  });

  it('paid on time, a late instalment year does not matter: there is nothing to pay', () => {
    expect(adjustmentProblem({ ...FILLED, effectiveMonth: '2026-12', firstPaidMonth: '2026-12', installments: '2' })).toBeNull();
  });
});

describe('toEngineInput', () => {
  it('the base salary and the later food discount follow today unless typed', () => {
    const input = toEngineInput({
      ...FILLED,
      foodBefore: { kind: 'percent', percent: '5', allowance: 80_000, amount: null },
    });

    expect(input.baseSalary).toBe(900_000);
    expect(input.rate).toBe(500);
    expect(input.foodDiscountAfter).toEqual({ kind: 'percent', percent: 500, allowance: 80_000 });
  });

  it('keeps what was typed for each of them', () => {
    const input = toEngineInput({
      ...FILLED,
      baseSalary: 800_000,
      baseSalaryTyped: true,
      foodBefore: { kind: 'fixed', percent: '5', allowance: null, amount: 200 },
      foodAfter: { kind: 'percent', percent: '5', allowance: 90_000, amount: null },
      otherDiscounts: [
        { id: 1, name: ' Plano ', amount: 1_000 },
        { id: 2, name: '', amount: null },
      ],
    });

    expect(input.baseSalary).toBe(800_000);
    expect(input.foodDiscountBefore).toEqual({ kind: 'fixed', amount: 200 });
    expect(input.foodDiscountAfter).toEqual({ kind: 'percent', percent: 500, allowance: 90_000 });
    expect(input.otherDiscounts).toEqual([{ name: 'Plano', amount: 1_000 }]);
  });
});

describe('arrearsMonthCount', () => {
  it('counts from the effective month up to the one before the first payroll', () => {
    expect(arrearsMonthCount('2026-05', '2026-09')).toBe(4);
    expect(arrearsMonthCount('2026-09', '2026-09')).toBe(0);
    expect(arrearsMonthCount('', '2026-09')).toBe(0);
  });
});

import { divideHalfUp, splitEvenly, sum } from '@/lib/payroll/cents';
import { addMonths, monthIndex, monthsBetween, yearOf } from '@/lib/payroll/months';
import { inss, irrf, taxTableFor, type TaxTable } from '@/lib/payroll/tax-tables';

/** FGTS is 8%, deposited by the employer: it never comes out of the net pay. */
const FGTS_PERCENT = 8;
const DAYS_IN_PAYROLL_MONTH = 30;

export const MIN_INSTALLMENTS = 1;
export const MAX_INSTALLMENTS = 12;

/**
 * What the employer takes for the food allowance: a share of the allowance itself, or
 * an amount. `percent` is in hundredths of a percent — 5% is 500.
 */
export type FoodDiscount =
  | { kind: 'percent'; percent: number; allowance: number }
  | { kind: 'fixed'; amount: number };

export type FixedDiscount = { name: string; amount: number };

export type SalaryAdjustmentInput = {
  /** The gross salary paid today, in cents. */
  salary: number;
  /** The salary the rate applies to. An agreement may name an earlier one than today's. */
  baseSalary: number;
  /** In hundredths of a percent: 4,5% is 450. */
  rate: number;
  /** The month the adjustment is owed from, `2026-05`. */
  effectiveMonth: string;
  /** The first payroll that pays the new salary. */
  firstPaidMonth: string;
  installments: number;
  dependents: number;
  /** Vacation days taken in the months owed at the old salary. */
  vacationDays: number;
  foodDiscountBefore: FoodDiscount;
  foodDiscountAfter: FoodDiscount;
  otherDiscounts: readonly FixedDiscount[];
};

export type MonthlyPay = {
  gross: number;
  inss: number;
  irrf: number;
  foodDiscount: number;
  otherDiscounts: readonly FixedDiscount[];
  net: number;
  fgts: number;
};

export type Installment = {
  month: string;
  salaryDifference: number;
  vacationDifference: number;
  vacationThird: number;
  gross: number;
  inss: number;
  irrf: number;
  net: number;
};

export type Arrears = {
  /** The months owed at the old salary. Empty when the new salary is paid on time. */
  months: readonly string[];
  monthlyDifference: number;
  salaryDifference: number;
  vacationDifference: number;
  vacationThird: number;
  gross: number;
  inss: number;
  irrf: number;
  net: number;
  fgts: number;
  installments: readonly Installment[];
};

export type SalaryAdjustment = {
  salaryBefore: number;
  salaryAfter: number;
  before: MonthlyPay;
  after: MonthlyPay;
  /** What the raise alone adds to the net pay, the discounts left as they were. */
  netRaise: number;
  /** How much more the fixed discounts take after the adjustment; negative when less. */
  discountChange: number;
  arrears: Arrears;
};

export class FirstPaidBeforeEffectiveError extends Error {}

const fgts = (amount: number) => divideHalfUp(amount * FGTS_PERCENT, 100);

export function foodDiscountAmount(discount: FoodDiscount): number {
  if (discount.kind === 'fixed') return discount.amount;
  return divideHalfUp(discount.allowance * discount.percent, 10_000);
}

function monthlyPay(
  table: TaxTable,
  salary: number,
  dependents: number,
  foodDiscount: number,
  otherDiscounts: readonly FixedDiscount[],
): MonthlyPay {
  const inssPaid = inss(table, salary);
  const irrfPaid = irrf(table, salary, inssPaid, dependents);
  const fixed = foodDiscount + sum(otherDiscounts.map((discount) => discount.amount));
  return {
    gross: salary,
    inss: inssPaid,
    irrf: irrfPaid,
    foodDiscount,
    otherDiscounts,
    net: salary - inssPaid - irrfPaid - fixed,
    fgts: fgts(salary),
  };
}

const NO_ARREARS = {
  months: [],
  salaryDifference: 0,
  vacationDifference: 0,
  vacationThird: 0,
  gross: 0,
  inss: 0,
  irrf: 0,
  net: 0,
  fgts: 0,
  installments: [],
} as const;

/**
 * INSS is due in each ORIGINAL month against that month's ceiling, so a salary already
 * above it owes none. The third is taken as if it sat on top of the new salary in the
 * first month, which is exact above the ceiling and close below it.
 */
function inssOnArrears(
  months: readonly string[],
  salaryBefore: number,
  salaryAfter: number,
  vacationThird: number,
): number {
  const onDifferences = months.map((month) => {
    const table = taxTableFor(yearOf(month));
    return inss(table, salaryAfter) - inss(table, salaryBefore);
  });
  const firstTable = taxTableFor(yearOf(months[0]));
  const onThird = inss(firstTable, salaryAfter + vacationThird) - inss(firstTable, salaryAfter);
  return sum(onDifferences) + onThird;
}

function arrearsOf(input: SalaryAdjustmentInput, salaryAfter: number, after: MonthlyPay): Arrears {
  const months = monthsBetween(input.effectiveMonth, input.firstPaidMonth);
  const monthlyDifference = salaryAfter - input.salary;
  if (months.length === 0) return { ...NO_ARREARS, monthlyDifference };

  // A month partly on vacation still owes the whole difference: the days on vacation
  // are paid as vacation, which also earns the constitutional third on top.
  const owed = monthlyDifference * months.length;
  const vacationDifference = Math.min(
    owed,
    divideHalfUp(monthlyDifference * input.vacationDays, DAYS_IN_PAYROLL_MONTH),
  );
  const salaryDifference = owed - vacationDifference;
  const vacationThird = divideHalfUp(vacationDifference, 3);

  const inssOwed = inssOnArrears(months, input.salary, salaryAfter, vacationThird);

  const parts = input.installments;
  const salaryShares = splitEvenly(salaryDifference, parts);
  const vacationShares = splitEvenly(vacationDifference, parts);
  const thirdShares = splitEvenly(vacationThird, parts);
  const inssShares = splitEvenly(inssOwed, parts);

  const installments = salaryShares.map((salaryShare, index): Installment => {
    const month = addMonths(input.firstPaidMonth, index);
    const table = taxTableFor(yearOf(month));
    // Each instalment is added to that month's payroll, so its IRRF is what it adds to
    // the tax of the new salary. Only the salary difference is taxed there: vacation
    // pay has a tax calculation of its own, and its difference comes without IRRF.
    const irrfAdded =
      irrf(table, salaryAfter + salaryShare, after.inss + inssShares[index], input.dependents) -
      irrf(table, salaryAfter, after.inss, input.dependents);
    const gross = salaryShare + vacationShares[index] + thirdShares[index];
    return {
      month,
      salaryDifference: salaryShare,
      vacationDifference: vacationShares[index],
      vacationThird: thirdShares[index],
      gross,
      inss: inssShares[index],
      irrf: irrfAdded,
      net: gross - inssShares[index] - irrfAdded,
    };
  });

  const gross = owed + vacationThird;
  const irrfOwed = sum(installments.map((installment) => installment.irrf));
  return {
    months,
    monthlyDifference,
    salaryDifference,
    vacationDifference,
    vacationThird,
    gross,
    inss: inssOwed,
    irrf: irrfOwed,
    net: gross - inssOwed - irrfOwed,
    fgts: fgts(gross),
    installments,
  };
}

/**
 * What a CLT salary adjustment changes: the monthly payroll, and the arrears.
 *
 * - The new salary is today's plus the rate applied to `baseSalary`.
 * - The monthly payroll before and after are ordinary months, both on the table of the
 *   first payroll's year, each with its own food allowance discount.
 * - The arrears are the difference times the months owed, paid as salary differences in
 *   equal instalments from the first payroll on, one a month, with INSS, IRRF and FGTS.
 *
 * Not modelled: the 13th salary, which follows the new salary on its own, and anything
 * else paid in the same payroll as an instalment.
 */
export function calculateSalaryAdjustment(input: SalaryAdjustmentInput): SalaryAdjustment {
  if (monthIndex(input.firstPaidMonth) < monthIndex(input.effectiveMonth)) {
    throw new FirstPaidBeforeEffectiveError();
  }

  const salaryAfter = input.salary + divideHalfUp(input.baseSalary * input.rate, 10_000);
  const table = taxTableFor(yearOf(input.firstPaidMonth));
  const before = monthlyPay(
    table,
    input.salary,
    input.dependents,
    foodDiscountAmount(input.foodDiscountBefore),
    input.otherDiscounts,
  );
  const after = monthlyPay(
    table,
    salaryAfter,
    input.dependents,
    foodDiscountAmount(input.foodDiscountAfter),
    input.otherDiscounts,
  );
  const discountChange = after.foodDiscount - before.foodDiscount;

  return {
    salaryBefore: input.salary,
    salaryAfter,
    before,
    after,
    netRaise: after.net - before.net + discountChange,
    discountChange,
    arrears: arrearsOf(input, salaryAfter, after),
  };
}

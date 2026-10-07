import { addMonths, monthIndex, yearOf } from '@/lib/payroll/months';
import {
  MAX_INSTALLMENTS,
  MIN_INSTALLMENTS,
  type FoodDiscount,
  type SalaryAdjustmentInput,
} from '@/lib/payroll/salary-adjustment';
import { hasTaxTable } from '@/lib/payroll/tax-tables';

const MAX_PERCENT = 100;
const DAYS_IN_PAYROLL_MONTH = 30;

/** The percentage the union agreement allows an employer to take from the allowance. */
export const DEFAULT_FOOD_PERCENT = '5';

export type FoodDiscountForm = {
  kind: 'percent' | 'fixed';
  percent: string;
  /** The food allowance itself, in cents; null while empty. */
  allowance: number | null;
  /** The discount when it is a fixed amount, in cents; null while empty. */
  amount: number | null;
};

export type OtherDiscountForm = { id: number; name: string; amount: number | null };

export type AdjustmentForm = {
  salary: number | null;
  /** Follows `salary`, the common case, until somebody types in it. */
  baseSalary: number | null;
  baseSalaryTyped: boolean;
  dependents: number;
  foodBefore: FoodDiscountForm;
  /** Null until somebody changes it: the discount stays as it is today. */
  foodAfter: FoodDiscountForm | null;
  otherDiscounts: OtherDiscountForm[];
  rate: string;
  effectiveMonth: string;
  firstPaidMonth: string;
  vacationDays: string;
  installments: string;
};

export const EMPTY_FOOD_DISCOUNT: FoodDiscountForm = {
  kind: 'percent',
  percent: DEFAULT_FOOD_PERCENT,
  allowance: null,
  amount: null,
};

export const EMPTY_FORM: AdjustmentForm = {
  salary: null,
  baseSalary: null,
  baseSalaryTyped: false,
  dependents: 0,
  foodBefore: EMPTY_FOOD_DISCOUNT,
  foodAfter: null,
  otherDiscounts: [],
  rate: '',
  effectiveMonth: '',
  firstPaidMonth: '',
  vacationDays: '0',
  installments: '1',
};

/** `incomplete` is a field nobody has answered yet: it disables Calcular without a message. */
export type AdjustmentProblem =
  | 'incomplete'
  | 'rate'
  | 'foodPercent'
  | 'order'
  | 'installments'
  | 'beyondTables'
  | 'vacationDays';

export const PROBLEM_MESSAGES: Record<Exclude<AdjustmentProblem, 'incomplete'>, string> = {
  rate: 'O reajuste precisa ser um percentual acima de 0 e até 100, com no máximo duas casas.',
  foodPercent: 'O percentual do vale precisa ficar entre 0 e 100, com no máximo duas casas.',
  order: 'A primeira folha com o salário novo não pode ser antes do mês em que o reajuste vale.',
  installments: `O retroativo pode ser pago em ${MIN_INSTALLMENTS} a ${MAX_INSTALLMENTS} parcelas.`,
  beyondTables: 'As parcelas passam do último ano com tabela de INSS e IRRF publicada. Use menos parcelas.',
  vacationDays: 'Os dias de férias não cabem nos meses do retroativo: são no máximo 30 por mês.',
};

/**
 * A typed percentage — `4,5` or `4.5` — in hundredths of a percent (450), or null when
 * it is not one: from zero up to 100, at most two decimal places.
 */
export function parsePercent(text: string): number | null {
  const normalised = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null;
  const [whole, decimals = ''] = normalised.split('.');
  const hundredths = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  return hundredths > MAX_PERCENT * 100 ? null : hundredths;
}

function parseCount(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
}

/** Months owed at the old salary: from the effective month up to the one before the first payroll. */
export function arrearsMonthCount(effectiveMonth: string, firstPaidMonth: string): number {
  if (!effectiveMonth || !firstPaidMonth) return 0;
  return Math.max(0, monthIndex(firstPaidMonth) - monthIndex(effectiveMonth));
}

function foodDiscountOf(form: FoodDiscountForm): FoodDiscount | null {
  if (form.kind === 'fixed') return { kind: 'fixed', amount: form.amount ?? 0 };
  const percent = parsePercent(form.percent);
  if (percent === null) return null;
  return { kind: 'percent', percent, allowance: form.allowance ?? 0 };
}

/** The salary the rate applies to: the one typed, or today's while nobody typed one. */
export function baseSalaryOf(form: AdjustmentForm): number | null {
  return form.baseSalaryTyped ? form.baseSalary : form.salary;
}

/**
 * What is wrong with the form before it is worth calculating. Null means it can be.
 * The order is the order a person fixes them in.
 */
export function adjustmentProblem(form: AdjustmentForm): AdjustmentProblem | null {
  if (!form.salary || !baseSalaryOf(form) || form.rate.trim() === '') return 'incomplete';
  const rate = parsePercent(form.rate);
  if (rate === null || rate === 0) return 'rate';
  if (foodDiscountOf(form.foodBefore) === null) return 'foodPercent';
  if (form.foodAfter && foodDiscountOf(form.foodAfter) === null) return 'foodPercent';
  if (!form.effectiveMonth || !form.firstPaidMonth) return 'incomplete';
  if (monthIndex(form.firstPaidMonth) < monthIndex(form.effectiveMonth)) return 'order';

  const months = arrearsMonthCount(form.effectiveMonth, form.firstPaidMonth);
  const installments = parseCount(form.installments);
  if (installments === null || installments < MIN_INSTALLMENTS || installments > MAX_INSTALLMENTS) {
    return 'installments';
  }
  const lastInstallment = addMonths(form.firstPaidMonth, installments - 1);
  if (months > 0 && !hasTaxTable(yearOf(lastInstallment))) return 'beyondTables';

  const vacationDays = parseCount(form.vacationDays === '' ? '0' : form.vacationDays);
  if (vacationDays === null || vacationDays > months * DAYS_IN_PAYROLL_MONTH) return 'vacationDays';
  return null;
}

/** The form as the engine takes it. Only call it on a form with no problem. */
export function toEngineInput(form: AdjustmentForm): SalaryAdjustmentInput {
  const salary = form.salary ?? 0;
  const foodDiscountBefore = foodDiscountOf(form.foodBefore)!;
  return {
    salary,
    baseSalary: baseSalaryOf(form) ?? salary,
    rate: parsePercent(form.rate) ?? 0,
    effectiveMonth: form.effectiveMonth,
    firstPaidMonth: form.firstPaidMonth,
    installments: parseCount(form.installments) ?? MIN_INSTALLMENTS,
    dependents: form.dependents,
    vacationDays: parseCount(form.vacationDays) ?? 0,
    foodDiscountBefore,
    foodDiscountAfter: form.foodAfter ? foodDiscountOf(form.foodAfter)! : foodDiscountBefore,
    otherDiscounts: form.otherDiscounts
      .filter((discount) => discount.amount)
      .map((discount) => ({ name: discount.name.trim() || 'Desconto', amount: discount.amount ?? 0 })),
  };
}

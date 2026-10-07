import { monthNumberOf, yearOf } from '@/lib/payroll/months';

const AMOUNT = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

/** Cents as `9.000,00`, with no currency sign. */
export const formatAmount = (cents: number) => AMOUNT.format(cents / 100);

/** Cents as `R$ 9.000,00`. */
export const formatMoney = (cents: number) => `R$ ${formatAmount(cents)}`;

/** Hundredths of a percent as `4,5%`. */
export const formatPercent = (hundredths: number) => `${String(hundredths / 100).replace('.', ',')}%`;

/** `2026-09` as `Setembro 2026`. */
export const formatMonth = (month: string) => `${MONTH_NAMES[monthNumberOf(month) - 1]} ${yearOf(month)}`;

/** `2026-09` as `set/2026`. */
export const formatShortMonth = (month: string) =>
  `${MONTH_NAMES[monthNumberOf(month) - 1].slice(0, 3).toLowerCase()}/${yearOf(month)}`;

/**
 * Money is whole cents in a `number`, and every rate is an integer too, so no amount
 * ever passes through a binary fraction: `0.1 + 0.2` is not a rounding rule.
 *
 * Every helper takes non-negative operands, which is all payroll has.
 */

/** Rates are written in millionths: 7,5% is 75_000, and 0,133145 is 133_145. */
export const RATE_SCALE = 1_000_000;

/** `numerator / denominator`, dropping the remainder. */
export function divideDown(numerator: number, denominator: number): number {
  return (numerator - (numerator % denominator)) / denominator;
}

/** `numerator / denominator`, half a unit and up going up. */
export function divideHalfUp(numerator: number, denominator: number): number {
  return divideDown(2 * numerator + denominator, 2 * denominator);
}

/**
 * `total` in `parts` shares of whole cents; the odd cents go to the FIRST one, which is
 * where a payroll puts them.
 */
export function splitEvenly(total: number, parts: number): number[] {
  const share = divideDown(total, parts);
  return [total - share * (parts - 1), ...Array<number>(parts - 1).fill(share)];
}

export const sum = (amounts: readonly number[]) => amounts.reduce((total, amount) => total + amount, 0);

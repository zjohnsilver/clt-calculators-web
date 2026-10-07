'use client';

import { ChevronDown } from 'lucide-react';

import { formatAmount } from '@/lib/format';
import { cn } from '@/lib/utils';

const BOX =
  'flex h-field min-w-0 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-[15px] focus-within:border-ink focus-within:ring-1 focus-within:ring-ink';
const INNER = 'w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:text-subtle';

/** The most a field takes: 11 digits is R$ 999.999.999,99. */
const MAX_DIGITS = 11;

/**
 * An amount in cents, typed like on a card machine: the digits push in from the right,
 * so nobody has to find the comma. Null is a field nobody has filled.
 */
export function MoneyInput({
  id,
  value,
  onChange,
  big = false,
  suffix,
  ariaLabel,
}: {
  id?: string;
  value: number | null;
  onChange: (cents: number | null) => void;
  big?: boolean;
  suffix?: string;
  ariaLabel?: string;
}) {
  function read(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, MAX_DIGITS);
    const cents = Number(digits);
    // Backspacing over "0,00" leaves two zeros: that is an empty field, not zero reais.
    onChange(digits === '' || (cents === 0 && digits.length < 3) ? null : cents);
  }

  return (
    <div className={cn(BOX, big && 'h-14')}>
      <span className="text-sm text-muted">R$</span>
      <input
        id={id}
        aria-label={ariaLabel}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0,00"
        value={value === null ? '' : formatAmount(value)}
        onChange={(event) => read(event.target.value)}
        className={cn(INNER, big && 'font-display text-xl font-semibold')}
      />
      {suffix ? <span className="shrink-0 text-sm text-muted">{suffix}</span> : null}
    </div>
  );
}

/** Free text that is checked when calculating: a percentage, a count, a name. */
export function TextInput({
  id,
  value,
  onChange,
  suffix,
  inputMode = 'text',
  placeholder,
  invalid = false,
  ariaLabel,
  maxLength,
}: {
  id?: string;
  value: string;
  onChange: (text: string) => void;
  suffix?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
  placeholder?: string;
  invalid?: boolean;
  ariaLabel?: string;
  maxLength?: number;
}) {
  return (
    <div className={cn(BOX, invalid && 'border-danger')}>
      <input
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        inputMode={inputMode}
        autoComplete="off"
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INNER}
      />
      {suffix ? <span className="shrink-0 text-sm text-muted">{suffix}</span> : null}
    </div>
  );
}

/** A native select in the field's clothes: the phone's own picker is the best one. */
export function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  invalid = false,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder: string;
  ariaLabel: string;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(BOX, 'relative px-0', invalid && 'border-danger', className)}>
      <select
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-full w-full min-w-0 appearance-none rounded-xl bg-transparent pl-3.5 pr-9 outline-none',
          value === '' && 'text-subtle',
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 size-4 text-muted" />
    </div>
  );
}

/**
 * A choice between two options, as radio options with a dot — a segmented control
 * would read as tabs switching the view.
 */
export function RadioOptions<Value extends string>({
  name,
  label,
  value,
  onChange,
  options,
}: {
  name: string;
  label: string;
  value: Value;
  onChange: (value: Value) => void;
  options: readonly { value: Value; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'flex h-control min-w-0 flex-1 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border bg-white px-3 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink has-[:focus-visible]:ring-offset-2',
              checked ? 'border-ink shadow-[inset_0_0_0_1px_#0B0B0D]' : 'border-line',
            )}
          >
            <input
              type="radio"
              name={name}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                'grid size-4 shrink-0 place-items-center rounded-full border-[1.5px]',
                checked ? 'border-ink' : 'border-line-strong',
              )}
            >
              {checked ? <span className="size-2 rounded-full bg-ink" /> : null}
            </span>
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

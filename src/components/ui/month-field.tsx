'use client';

import { SelectInput } from '@/components/ui/inputs';
import { MONTH_NAMES } from '@/lib/format';
import { makeMonth, monthNumberOf, yearOf } from '@/lib/payroll/months';
import { TAX_TABLE_YEARS } from '@/lib/payroll/tax-tables';

const MONTH_OPTIONS = MONTH_NAMES.map((name, index) => ({ value: String(index + 1), label: name }));
/** Only the years there is a tax table for: any other would be refused anyway. */
const YEAR_OPTIONS = TAX_TABLE_YEARS.map((year) => ({ value: String(year), label: String(year) }));

/**
 * A month, picked as month + year, holding `2026-06`. Two selects rather than a
 * `type="month"` input: that one is a text box in Safari.
 *
 * Empty (`''`) is a field nobody has answered yet, which is not the same as January.
 */
export function MonthField({
  id,
  value,
  onChange,
  label,
  invalid = false,
}: {
  id: string;
  value: string;
  onChange: (month: string) => void;
  /** Names both selects for a screen reader: "Vale a partir de — mês". */
  label: string;
  invalid?: boolean;
}) {
  const year = value ? yearOf(value) : null;
  const monthOfYear = value ? monthNumberOf(value) : null;

  // Picking one half of an empty field picks the other half's default, so the value is
  // never half-formed: January, or the latest year with a table.
  function change(nextYear: number | null, nextMonth: number | null) {
    onChange(makeMonth(nextYear ?? TAX_TABLE_YEARS[TAX_TABLE_YEARS.length - 1], nextMonth ?? 1));
  }

  return (
    <div className="flex gap-2.5">
      <SelectInput
        id={id}
        ariaLabel={`${label} — mês`}
        placeholder="Mês"
        value={monthOfYear ? String(monthOfYear) : ''}
        onChange={(next) => change(year, Number(next))}
        options={MONTH_OPTIONS}
        invalid={invalid}
        className="flex-1"
      />
      <SelectInput
        ariaLabel={`${label} — ano`}
        placeholder="Ano"
        value={year ? String(year) : ''}
        onChange={(next) => change(Number(next), monthOfYear)}
        options={YEAR_OPTIONS}
        invalid={invalid}
        className="w-[104px] shrink-0"
      />
    </div>
  );
}

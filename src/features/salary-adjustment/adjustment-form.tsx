'use client';

import { Minus, Plus, RotateCcw, X } from 'lucide-react';

import { Field } from '@/components/ui/field';
import { MoneyInput, RadioOptions, TextInput } from '@/components/ui/inputs';
import { MonthField } from '@/components/ui/month-field';
import {
  arrearsMonthCount,
  baseSalaryOf,
  parsePercent,
  PROBLEM_MESSAGES,
  type AdjustmentForm,
  type AdjustmentProblem,
  type FoodDiscountForm,
} from '@/features/salary-adjustment/form';
import { formatMoney, formatShortMonth } from '@/lib/format';
import { addMonths } from '@/lib/payroll/months';
import { foodDiscountAmount } from '@/lib/payroll/salary-adjustment';
import { cn } from '@/lib/utils';

const MAX_DEPENDENTS = 20;

const FOOD_KINDS = [
  { value: 'percent', label: '% do vale' },
  { value: 'fixed', label: 'Valor fixo' },
] as const;

function Card({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-card p-[18px]">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold">
        <span className="grid size-[22px] place-items-center rounded-full bg-ink font-mono text-xs font-medium text-paper">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const button =
    'grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-white focus-halo hover:bg-hover disabled:opacity-40';
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        aria-label="Um dependente a menos"
        disabled={value === 0}
        onClick={() => onChange(value - 1)}
        className={button}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <output
        aria-live="polite"
        className="grid h-12 flex-1 place-items-center rounded-xl border border-line bg-white font-medium tabular-nums"
      >
        {value}
      </output>
      <button
        type="button"
        aria-label="Um dependente a mais"
        disabled={value === MAX_DEPENDENTS}
        onClick={() => onChange(value + 1)}
        className={button}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** One line of the food allowance discount: how it is taken, and the figures for it. */
function FoodDiscountLine({
  id,
  title,
  value,
  onChange,
}: {
  id: string;
  title: string;
  value: FoodDiscountForm;
  onChange: (value: FoodDiscountForm) => void;
}) {
  const percent = parsePercent(value.percent);
  const discount =
    value.kind === 'percent' && percent !== null && value.allowance
      ? foodDiscountAmount({ kind: 'percent', percent, allowance: value.allowance })
      : null;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink">{title}</span>
      <RadioOptions
        name={`${id}-kind`}
        label={`${title}: como o desconto é feito`}
        value={value.kind}
        onChange={(kind) => onChange({ ...value, kind })}
        options={FOOD_KINDS}
      />
      {value.kind === 'fixed' ? (
        <MoneyInput
          ariaLabel={`${title}: desconto por mês`}
          suffix="por mês"
          value={value.amount}
          onChange={(amount) => onChange({ ...value, amount })}
        />
      ) : (
        <div className="flex gap-2.5">
          <Field small label="Percentual" htmlFor={`${id}-percent`} className="w-[84px] shrink-0">
            <TextInput
              id={`${id}-percent`}
              inputMode="decimal"
              suffix="%"
              maxLength={6}
              invalid={percent === null}
              value={value.percent}
              onChange={(text) => onChange({ ...value, percent: text })}
            />
          </Field>
          <Field
            small
            label="Vale alimentação por mês"
            htmlFor={`${id}-allowance`}
            className="flex-1"
            help="Informe só o valor depositado na categoria Alimentação. Não some refeição, cultura, saúde ou home office, mesmo que você transfira tudo para alimentação no seu cartão de benefícios (Caju): o desconto é calculado só sobre a alimentação."
          >
            <MoneyInput
              id={`${id}-allowance`}
              value={value.allowance}
              onChange={(allowance) => onChange({ ...value, allowance })}
            />
          </Field>
        </div>
      )}
      {discount !== null ? <p className="text-[13px] text-muted">= {formatMoney(discount)} de desconto</p> : null}
    </div>
  );
}

export function AdjustmentFormFields({
  form,
  onChange,
  problem,
  onCalculate,
}: {
  form: AdjustmentForm;
  onChange: (form: AdjustmentForm) => void;
  problem: AdjustmentProblem | null;
  onCalculate: () => void;
}) {
  const set = <Key extends keyof AdjustmentForm>(key: Key, value: AdjustmentForm[Key]) =>
    onChange({ ...form, [key]: value });

  const months = arrearsMonthCount(form.effectiveMonth, form.firstPaidMonth);
  const message = problem && problem !== 'incomplete' ? PROBLEM_MESSAGES[problem] : null;
  const nextDiscountId = Math.max(0, ...form.otherDiscounts.map((discount) => discount.id)) + 1;

  return (
    <form
      className="flex min-w-0 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (problem === null) onCalculate();
      }}
    >
      <Card step={1} title="Seu salário hoje">
        <Field label="Salário bruto atual" htmlFor="salary">
          <MoneyInput id="salary" big value={form.salary} onChange={(salary) => set('salary', salary)} />
        </Field>

        <Field
          label="Dependentes no IRRF"
          help="Quantos dependentes você declara no imposto de renda. Cada um reduz a base de cálculo do IRRF."
        >
          <Stepper value={form.dependents} onChange={(dependents) => set('dependents', dependents)} />
        </Field>

        <Field
          label="Desconto do vale alimentação"
          help="É o que a empresa desconta de você pelo vale. Os 5% vêm da convenção do sindicato, que permite descontar até 5% do valor do vale; altere se a sua empresa usa outro percentual. Se o desconto é um valor em reais, escolha Valor fixo. Sem vale, deixe em branco."
        >
          <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-hover p-2.5">
            <FoodDiscountLine
              id="food-before"
              title="Hoje"
              value={form.foodBefore}
              onChange={(foodBefore) => set('foodBefore', foodBefore)}
            />
            <div className="border-t border-line-strong pt-2.5">
              <FoodDiscountLine
                id="food-after"
                title="Depois do reajuste"
                value={form.foodAfter ?? form.foodBefore}
                onChange={(foodAfter) => set('foodAfter', foodAfter)}
              />
            </div>
          </div>
        </Field>

        <Field
          label="Outros descontos fixos"
          help="Descontos que saem todo mês e não mudam com o reajuste, como o plano de saúde de um dependente. Não inclua INSS nem imposto de renda: eles são calculados."
        >
          {form.otherDiscounts.map((discount) => {
            const change = (changed: Partial<typeof discount>) =>
              set(
                'otherDiscounts',
                form.otherDiscounts.map((other) => (other.id === discount.id ? { ...other, ...changed } : other)),
              );
            return (
              <div key={discount.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <TextInput
                    ariaLabel="Nome do desconto"
                    placeholder="Nome"
                    maxLength={40}
                    value={discount.name}
                    onChange={(name) => change({ name })}
                  />
                </div>
                <div className="w-[136px] shrink-0">
                  <MoneyInput
                    ariaLabel="Valor do desconto por mês"
                    value={discount.amount}
                    onChange={(amount) => change({ amount })}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Remover desconto ${discount.name}`.trim()}
                  onClick={() =>
                    set(
                      'otherDiscounts',
                      form.otherDiscounts.filter((other) => other.id !== discount.id),
                    )
                  }
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-muted focus-halo hover:bg-hover"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() =>
              set('otherDiscounts', [...form.otherDiscounts, { id: nextDiscountId, name: '', amount: null }])
            }
            className="flex h-control items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-sm font-medium text-muted focus-halo hover:bg-hover"
          >
            <Plus className="size-4" aria-hidden />
            Adicionar desconto
          </button>
        </Field>
      </Card>

      <Card step={2} title="O reajuste">
        <Field label="Reajuste" htmlFor="rate">
          <TextInput
            id="rate"
            inputMode="decimal"
            suffix="%"
            maxLength={6}
            invalid={problem === 'rate'}
            value={form.rate}
            onChange={(rate) => set('rate', rate)}
          />
        </Field>

        <Field
          label="Salário-base do reajuste"
          htmlFor="base-salary"
          help="É o salário sobre o qual o percentual é aplicado. Normalmente é o seu salário atual. Algumas convenções usam o salário da data-base anterior: se você teve aumento depois dela, informe o salário daquela data."
        >
          <MoneyInput
            id="base-salary"
            value={baseSalaryOf(form)}
            onChange={(baseSalary) => onChange({ ...form, baseSalary, baseSalaryTyped: true })}
          />
        </Field>

        <Field
          label="Vale a partir de"
          htmlFor="effective-month"
          help="O mês a partir do qual o reajuste é devido (a data-base da convenção), mesmo que ele só tenha sido pago depois."
        >
          <MonthField
            id="effective-month"
            label="Vale a partir de"
            invalid={problem === 'order'}
            value={form.effectiveMonth}
            onChange={(month) => set('effectiveMonth', month)}
          />
        </Field>

        <Field
          label="Primeira folha com o salário novo"
          htmlFor="first-paid-month"
          help="A primeira folha de pagamento que já veio com o salário reajustado. É o mês da folha, não o dia em que o dinheiro cai na conta."
        >
          <MonthField
            id="first-paid-month"
            label="Primeira folha com o salário novo"
            invalid={problem === 'order'}
            value={form.firstPaidMonth}
            onChange={(month) => set('firstPaidMonth', month)}
          />
        </Field>

        {months > 0 ? (
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <RotateCcw className="size-3.5 shrink-0" aria-hidden />
            Retroativo de {months} {months === 1 ? 'mês' : 'meses'}: {formatShortMonth(form.effectiveMonth)}
            {months > 1 ? ` a ${formatShortMonth(addMonths(form.firstPaidMonth, -1))}` : ''}
          </p>
        ) : null}

        <Field
          label="Dias de férias tirados nesses meses"
          htmlFor="vacation-days"
          help="Se você tirou férias nos meses do retroativo, informe quantos dias. A diferença desses dias é paga como férias: ganha 1/3 a mais e entra sem IRRF na parcela. Sem férias no período, deixe 0."
        >
          <TextInput
            id="vacation-days"
            inputMode="numeric"
            suffix="dias"
            maxLength={3}
            invalid={problem === 'vacationDays'}
            value={form.vacationDays}
            onChange={(vacationDays) => set('vacationDays', vacationDays)}
          />
        </Field>

        <Field label="Parcelas do retroativo (1 a 12)" htmlFor="installments">
          <TextInput
            id="installments"
            inputMode="numeric"
            maxLength={2}
            invalid={problem === 'installments' || problem === 'beyondTables'}
            value={form.installments}
            onChange={(installments) => set('installments', installments)}
          />
        </Field>

        {message ? (
          <p role="alert" className="text-[13px] text-danger">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={problem !== null}
          className={cn(
            'flex h-cta items-center justify-center rounded-[14px] bg-ink text-[15px] font-semibold text-paper focus-halo',
            'disabled:opacity-40',
          )}
        >
          Calcular
        </button>
      </Card>
    </form>
  );
}

'use client';

import { useMemo, useRef, useState } from 'react';

import { AdjustmentFormFields } from '@/features/salary-adjustment/adjustment-form';
import { AdjustmentResult } from '@/features/salary-adjustment/adjustment-result';
import { adjustmentProblem, DEFAULT_FORM, toEngineInput, type AdjustmentForm } from '@/features/salary-adjustment/form';
import {
  calculateSalaryAdjustment,
  type SalaryAdjustment,
  type SalaryAdjustmentInput,
} from '@/lib/payroll/salary-adjustment';
import { cn } from '@/lib/utils';

type Calculated = { input: SalaryAdjustmentInput; result: SalaryAdjustment };

/**
 * The salary adjustment calculator. Everything happens in this component's memory:
 * nothing is sent anywhere and nothing is kept, so a reload starts empty.
 *
 * Calcular is a button, never a live result: half-typed figures would flash numbers
 * nobody asked for. Changing a field afterwards keeps the last result on screen and
 * marks it as out of date.
 */
export function AdjustmentScreen() {
  const [form, setForm] = useState<AdjustmentForm>(DEFAULT_FORM);
  const [calculated, setCalculated] = useState<Calculated | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const problem = adjustmentProblem(form);
  const input = useMemo(() => (problem === null ? toEngineInput(form) : null), [form, problem]);
  const stale =
    calculated !== null && (input === null || JSON.stringify(input) !== JSON.stringify(calculated.input));

  function calculate() {
    if (input === null) return;
    setCalculated({ input, result: calculateSalaryAdjustment(input) });
    // On a phone the result is below the form: bring it into view once it is drawn.
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-[26px] font-semibold leading-[30px] tracking-[-0.6px] lg:text-[32px] lg:leading-9 lg:tracking-[-1px]">
            Reajuste salarial
          </h1>
          <span className="label-caps rounded-full border border-line-strong px-[9px] py-[3px] text-muted">
            CLT · tabelas 2026
          </span>
        </div>
        <p className="text-[15px] text-muted">Quanto muda no seu líquido e quanto vem de retroativo.</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[372px_minmax(0,1fr)] lg:gap-6">
        <AdjustmentFormFields form={form} onChange={setForm} problem={problem} onCalculate={calculate} />

        <div ref={resultRef} className="min-w-0 scroll-mt-4">
          {calculated === null ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-muted lg:min-h-[360px]">
              <b className="font-mono text-[22px] font-medium text-subtle">R$ —</b>
              Preencha seu salário e o reajuste e toque em Calcular.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {stale ? (
                <p role="status" className="rounded-xl border border-line-strong bg-hover px-3.5 py-2.5 text-[13px]">
                  <b className="font-semibold">Desatualizado.</b> Os dados mudaram: toque em Calcular para atualizar.
                </p>
              ) : null}
              <div className={cn('transition-opacity', stale && 'opacity-50')}>
                <AdjustmentResult result={calculated.result} input={calculated.input} />
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-subtle lg:hidden">Nada do que você digita sai do seu navegador.</p>
    </div>
  );
}

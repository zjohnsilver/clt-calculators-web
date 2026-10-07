import { HelpHint } from '@/components/ui/help-hint';
import { formatAmount, formatMoney, formatMonth, formatPercent, formatShortMonth } from '@/lib/format';
import { addMonths } from '@/lib/payroll/months';
import type { Arrears, SalaryAdjustment, SalaryAdjustmentInput } from '@/lib/payroll/salary-adjustment';
import { cn } from '@/lib/utils';

const CARD = 'flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-card p-[18px]';
const NUM = 'whitespace-nowrap tabular-nums';

/** `+ R$ 10,00`, `− R$ 10,00` or `R$ 0,00`: the sign is part of what a difference says. */
function signed(cents: number): string {
  if (cents === 0) return formatMoney(0);
  return `${cents > 0 ? '+' : '−'} ${formatMoney(Math.abs(cents))}`;
}

const taken = (cents: number) => `− ${formatMoney(cents)}`;

function Hero({
  label,
  amount,
  chip,
  was,
  dark = false,
}: {
  label: string;
  amount: number;
  chip: string;
  was: number;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2.5 rounded-2xl border p-5',
        dark ? 'border-ink bg-ink text-paper' : 'border-line bg-card',
      )}
    >
      <span className={cn('label-caps', dark && 'text-[#B9B4A8]')}>{label}</span>
      <span className={cn(NUM, 'font-display text-[38px] font-bold leading-10 tracking-[-1.2px] lg:text-[46px] lg:leading-[46px] lg:tracking-[-1.6px]')}>
        <small className="mr-1.5 text-[0.45em] font-semibold tracking-normal opacity-70">R$</small>
        {formatAmount(amount)}
      </span>
      <span className="flex flex-wrap items-center gap-2 text-[13px]">
        <span
          className={cn(
            NUM,
            'rounded-full px-2.5 py-[3px] font-semibold',
            dark ? 'bg-raise-strong text-white' : 'bg-raise-soft text-raise',
          )}
        >
          {chip}
        </span>
        <span className={cn(NUM, dark ? 'text-[#B9B4A8]' : 'text-muted')}>antes {formatMoney(was)}</span>
      </span>
    </div>
  );
}

type Part = { label: string; amount: string; tone?: 'raise' | 'arrears' | 'danger' };

const PART_TONES = { raise: 'text-raise', arrears: 'text-arrears', danger: 'text-danger' } as const;

/** One payroll: what it is made of, and what reaches the account. */
function PayMonth({
  title,
  subtitle,
  result,
  installmentNet,
}: {
  title: string;
  subtitle: string;
  result: SalaryAdjustment;
  installmentNet: number;
}) {
  const { before, after, netRaise, discountChange } = result;
  const parts: Part[] = [
    { label: 'Líquido anterior', amount: formatMoney(before.net) },
    { label: 'Aumento líquido', amount: formatMoney(netRaise), tone: 'raise' },
  ];
  if (installmentNet > 0) {
    parts.push({ label: 'Parcela do retroativo', amount: formatMoney(installmentNet), tone: 'arrears' });
  }
  if (discountChange !== 0) {
    parts.push({
      label: 'Descontos',
      amount: signed(-discountChange),
      tone: discountChange > 0 ? 'danger' : 'raise',
    });
  }

  return (
    <div className="grid gap-2.5 border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0 lg:grid-cols-[132px_minmax(0,1fr)_160px] lg:items-center lg:gap-3">
      <div>
        <b className="block whitespace-nowrap font-display text-base font-semibold">{title}</b>
        <span className="text-xs text-muted">{subtitle}</span>
      </div>

      <div className="flex min-w-0 flex-col gap-2.5">
        <div aria-hidden className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
          <i className="block bg-previous" style={{ flex: before.net }} />
          {netRaise > 0 ? <i className="block bg-raise" style={{ flex: netRaise }} /> : null}
          {installmentNet > 0 ? <i className="block bg-arrears" style={{ flex: installmentNet }} /> : null}
        </div>
        <dl className="flex flex-col gap-1.5 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-1.5">
          {parts.map((part, index) => (
            <div key={part.label} className="flex items-baseline justify-between gap-1.5 lg:items-end lg:justify-start">
              {index > 0 && !part.amount.startsWith('−') && !part.amount.startsWith('+') ? (
                <span aria-hidden className="hidden pb-px font-mono text-sm text-subtle lg:inline">
                  +
                </span>
              ) : null}
              <div className="contents lg:flex lg:flex-col lg:gap-px">
                <dt className="text-[13px] text-muted lg:text-[11px]">{part.label}</dt>
                <dd className={cn(NUM, 'font-mono text-[13px] font-medium', part.tone && PART_TONES[part.tone])}>
                  {part.amount}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex items-baseline justify-between border-t border-dashed border-line-strong pt-2.5 lg:block lg:border-t-0 lg:pt-0 lg:text-right">
        <span className="label-caps block">Cai na conta</span>
        <b className={cn(NUM, 'font-display text-2xl font-bold tracking-[-0.6px]')}>
          {formatMoney(after.net + installmentNet)}
        </b>
      </div>
    </div>
  );
}

function Line({
  label,
  detail,
  value,
  total = false,
}: {
  label: string;
  detail?: string;
  value: string;
  total?: boolean;
}) {
  return (
    <div className={cn('flex items-baseline gap-3', total && 'border-t border-line pt-2.5 font-semibold')}>
      <dt className={cn('flex min-w-0 flex-1 flex-col', total ? 'text-ink' : 'text-muted')}>
        {label}
        {detail ? <small className="text-xs font-normal text-muted">{detail}</small> : null}
      </dt>
      <dd className={cn(NUM, 'font-mono text-[13px]')}>{value}</dd>
    </div>
  );
}

/** "2 parcelas de R$ 10,00", or each amount when the odd cents make them differ. */
function installmentsSummary(arrears: Arrears): string {
  const amounts = arrears.installments.map((installment) => installment.net);
  if (amounts.every((amount) => amount === amounts[0])) {
    return `${amounts.length} ${amounts.length === 1 ? 'parcela' : 'parcelas'} de ${formatMoney(amounts[0])}`;
  }
  if (amounts.length === 2) return `Parcelas de ${formatMoney(amounts[0])} e ${formatMoney(amounts[1])}`;
  return `1ª parcela de ${formatMoney(amounts[0])}, as demais de ${formatMoney(amounts[1])}`;
}

function ArrearsCard({ arrears, vacationDays }: { arrears: Arrears; vacationDays: number }) {
  const count = arrears.months.length;
  if (count === 0) {
    return (
      <div className={CARD}>
        <span className="label-caps">Retroativo</span>
        <p className="text-sm text-muted">Não há retroativo: o salário novo foi pago já no mês em que passou a valer.</p>
      </div>
    );
  }

  const hasVacation = arrears.vacationDifference > 0;
  const period =
    count === 1
      ? formatShortMonth(arrears.months[0])
      : `${formatShortMonth(arrears.months[0])} – ${formatShortMonth(arrears.months[count - 1])}`;
  const owed = `${count} ${count === 1 ? 'mês' : 'meses'} × ${formatMoney(arrears.monthlyDifference)}`;

  return (
    <div className={CARD}>
      <span className="label-caps">Retroativo · {period}</span>
      <dl className="flex flex-col gap-2.5 text-sm">
        <Line
          label="Diferença de salário"
          detail={hasVacation ? `${owed}, menos ${vacationDays} dias de férias` : owed}
          value={formatMoney(arrears.salaryDifference)}
        />
        {hasVacation ? (
          <>
            <Line
              label="Diferença de férias"
              detail={`${vacationDays} dias`}
              value={formatMoney(arrears.vacationDifference)}
            />
            <Line label="1/3 de férias" value={formatMoney(arrears.vacationThird)} />
          </>
        ) : null}
        <Line
          label="INSS"
          detail={arrears.inss === 0 ? 'O salário já estava no teto' : 'Calculado mês a mês'}
          value={taken(arrears.inss)}
        />
        <Line
          label="IRRF"
          detail={hasVacation ? 'Só sobre a diferença de salário' : 'Somado à folha de cada parcela'}
          value={taken(arrears.irrf)}
        />
        <Line total label="Líquido" detail={installmentsSummary(arrears)} value={formatMoney(arrears.net)} />
      </dl>
    </div>
  );
}

export function AdjustmentResult({ result, input }: { result: SalaryAdjustment; input: SalaryAdjustmentInput }) {
  const { before, after, arrears } = result;
  const raise = result.salaryAfter - result.salaryBefore;
  const sameBase = input.baseSalary === input.salary;
  const afterInstallments = addMonths(input.firstPaidMonth, arrears.installments.length);
  const hasFoodDiscount = before.foodDiscount > 0 || after.foodDiscount > 0;

  const rows: { label: string; before: string; after: string; change: string; total?: boolean }[] = [
    {
      label: 'Salário bruto',
      before: formatMoney(before.gross),
      after: formatMoney(after.gross),
      change: signed(after.gross - before.gross),
    },
    { label: 'INSS', before: taken(before.inss), after: taken(after.inss), change: signed(before.inss - after.inss) },
    { label: 'IRRF', before: taken(before.irrf), after: taken(after.irrf), change: signed(before.irrf - after.irrf) },
    ...(hasFoodDiscount
      ? [
          {
            label: 'Vale alimentação',
            before: taken(before.foodDiscount),
            after: taken(after.foodDiscount),
            change: signed(before.foodDiscount - after.foodDiscount),
          },
        ]
      : []),
    ...before.otherDiscounts.map((discount) => ({
      label: discount.name,
      before: taken(discount.amount),
      after: taken(discount.amount),
      change: formatMoney(0),
    })),
    {
      label: 'Líquido',
      before: formatMoney(before.net),
      after: formatMoney(after.net),
      change: signed(after.net - before.net),
      total: true,
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <Hero
          label="Novo salário bruto"
          amount={result.salaryAfter}
          chip={`+ ${formatMoney(raise)} · ${formatPercent(input.rate)}${sameBase ? '' : ` de ${formatMoney(input.baseSalary)}`}`}
          was={result.salaryBefore}
        />
        <Hero
          dark
          label="Novo salário líquido"
          amount={after.net}
          chip={`${signed(after.net - before.net)} por mês`}
          was={before.net}
        />
      </div>

      <section className={CARD}>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold">O que cai na conta</h2>
          <HelpHint label="O que cai na conta">
            O líquido de cada folha a partir do reajuste: o que você já recebia, mais o aumento já descontado de INSS e
            IRRF, mais a parcela líquida do retroativo. Uma mudança nos descontos aparece à parte.
          </HelpHint>
        </div>
        <ul aria-hidden className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px] bg-previous" />
            Líquido anterior
          </li>
          <li className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px] bg-raise" />
            Aumento líquido
          </li>
          {arrears.installments.length > 0 ? (
            <li className="flex items-center gap-1.5">
              <i className="size-2.5 rounded-[3px] bg-arrears" />
              Parcela do retroativo
            </li>
          ) : null}
        </ul>
        <div className="flex flex-col">
          {arrears.installments.map((installment, index) => (
            <PayMonth
              key={installment.month}
              title={formatMonth(installment.month)}
              subtitle={`Parcela ${index + 1} de ${arrears.installments.length}`}
              result={result}
              installmentNet={installment.net}
            />
          ))}
          <PayMonth title={formatMonth(afterInstallments)} subtitle="em diante" result={result} installmentNet={0} />
        </div>
      </section>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <section className={cn(CARD, 'lg:col-span-2')}>
          <h2 className="label-caps">Folha mensal · antes e depois</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="label-caps">
                <th className="py-[7px] text-left font-medium">
                  <span className="sr-only">Verba</span>
                </th>
                <th className="py-[7px] pl-3 text-right font-medium">Antes</th>
                <th className="py-[7px] pl-3 text-right font-medium">Depois</th>
                <th className="hidden py-[7px] pl-3 text-right font-medium lg:table-cell">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className={cn(row.total && 'border-t border-line font-semibold')}>
                  <th
                    scope="row"
                    className={cn('py-[7px] text-left font-normal', row.total ? 'pt-2.5 font-semibold' : 'text-muted')}
                  >
                    {row.label}
                  </th>
                  {[row.before, row.after].map((cell, index) => (
                    <td
                      key={index}
                      className={cn(
                        NUM,
                        'py-[7px] pl-3 text-right font-mono text-[13px]',
                        row.total && 'pt-2.5',
                        index === 1 && !row.total && 'font-medium',
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                  <td
                    className={cn(
                      NUM,
                      'hidden py-[7px] pl-3 text-right font-mono text-[13px] lg:table-cell',
                      row.total ? 'pt-2.5' : 'text-muted',
                    )}
                  >
                    {row.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {before.inss === after.inss ? (
            <p className="rounded-xl bg-hover px-3.5 py-2.5 text-[13px] text-muted">
              O INSS não muda: os dois salários já estão no teto. Do aumento, só sai IRRF.
            </p>
          ) : null}
        </section>

        <ArrearsCard arrears={arrears} vacationDays={input.vacationDays} />

        <section className={CARD}>
          <div className="flex items-center gap-2">
            <h2 className="label-caps">FGTS · depositado pela empresa</h2>
            <HelpHint label="FGTS">
              A empresa deposita 8% do salário bruto na sua conta do FGTS. Esse valor não sai do seu líquido.
            </HelpHint>
          </div>
          <dl className="flex flex-col gap-2.5 text-sm">
            <Line label="Por mês" value={`${formatMoney(before.fgts)} → ${formatMoney(after.fgts)}`} />
            <Line label="A mais por mês" value={signed(after.fgts - before.fgts)} />
            <Line label="Sobre o retroativo" value={signed(arrears.fgts)} />
          </dl>
        </section>
      </div>

      <p className="text-xs leading-normal text-subtle">
        Estimativa com as tabelas oficiais de INSS e IRRF de 2026. O retroativo é tratado como diferença de salário, com
        INSS, IRRF e FGTS. A diferença de férias entra sem IRRF na parcela. Não considera 13º nem outras verbas pagas na
        mesma folha.
      </p>
    </div>
  );
}

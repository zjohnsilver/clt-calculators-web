# clt-calculators-web

Calculators for Brazilian CLT payroll, shared as a public site. Everything is calculated in
the browser: there is no API, no database, no login and no stored state.

## Commands

| Command | What it does |
|---|---|
| `yarn dev` | Dev server on port 12000 (registered in the parent `repositories/CLAUDE.md`) |
| `yarn build` | Production build |
| `yarn test` | Unit tests (vitest, pure logic only) |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn lint` | eslint |

Node 22 through mise (`.mise.toml`), yarn 4 through corepack. No Makefile: a web repo keeps
its commands in `package.json`.

## Hard rules

- **The repository is public: no real person's figures, ever.** Tests, design docs,
  screenshots and examples use made-up salaries. No employer names either.
- **Nothing leaves the browser.** No fetch, no analytics, no third-party script, no
  `localStorage`. `next.config.ts` sets `connect-src 'self'` so the page cannot call out; do
  not loosen it.
- **The UI is in Portuguese, light theme only.** Code, comments, docs and commits are in
  English.
- **Money is whole cents in a `number`, rates are integers** (`src/lib/payroll/cents.ts`).
  Never a float amount, never `Date` for a month (`months.ts` explains why).

## Layout

| Path | What lives there |
|---|---|
| `src/lib/payroll/` | The math, with no React: `tax-tables.ts` (INSS and IRRF, one table per year), `salary-adjustment.ts` (the engine), `cents.ts`, `months.ts`, and their tests |
| `src/lib/calculators.ts` | The list of calculators the side rail and the tabs draw |
| `src/components/shell/` | The chrome: a side rail from 1024px up (icons, opens on hover), a top bar with tabs below |
| `src/components/ui/` | Shared controls: `Field`, `HelpHint` (the "?"), `MoneyInput`, `TextInput`, `SelectInput`, `RadioOptions`, `MonthField` |
| `src/features/<calculator>/` | One calculator: `form.ts` (form state, validation, conversion to the engine's input, tested), the form, the result and the screen |
| `src/app/<route>/page.tsx` | The route: metadata plus the feature's screen |
| `docs/design/` | Approved mockups |

## Adding a calculator

1. Write its math in `src/lib/payroll/` with tests; expected values come from a trusted
   source (an official example, a reference implementation), never from the code under test.
2. Build `src/features/<name>/` and its route under `src/app/`.
3. Add one line to `CALCULATORS` in `src/lib/calculators.ts`.

## Screen conventions

- **Calcular is a button, never a live result.** Changing a field afterwards keeps the last
  result on screen, dimmed, under a "Desatualizado" notice.
- **An explanation goes behind the field's "?"** (`help` on `Field`), never in an inline hint
  line. A line under a control is only for state that the input produces ("= R$ 45,00 de
  desconto").
- **A choice between two options is `RadioOptions`**, not a segmented control.
- **A field that usually repeats another follows it until typed in**: the base salary follows
  the salary, the food allowance discount after the adjustment follows today's.
- Check a screen at 1280 and 375 before a PR: no sideways scroll, no clipped label.

## The salary adjustment engine

`calculateSalaryAdjustment` in `src/lib/payroll/salary-adjustment.ts`; its doc comments are
the specification. In short:

- New salary = today's + rate × base salary (the base may be an earlier salary).
- The monthly payroll before and after use the table of the first payroll's year.
- Arrears = the difference × the months owed, always paid as salary differences: INSS per
  original month against that month's ceiling, IRRF as what each instalment adds to that
  month's tax, FGTS at 8%.
- Vacation days in the months owed turn part of the difference into vacation pay: it earns
  the constitutional third and carries no IRRF in the instalment.
- Instalments are equal, the odd cents on the first.
- INSS bands are truncated to the cent, which is why the 2026 ceiling is 988,07.

Not modelled: the 13th salary and anything else paid in the same payroll.

## January chore

Add the new year's `TaxTable` to `src/lib/payroll/tax-tables.ts` and a row of expected
values to the tables' test. The month pickers offer only the years that have a table.

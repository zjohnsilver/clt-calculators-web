# 🧮 clt-calculators-web

Calculators for Brazilian CLT payroll that run entirely in the browser: no login, no API,
no database. Nothing typed into the site leaves it, and a reload starts empty.

The site itself is in Portuguese; the code and the docs are in English.

## 📊 Calculators

| Calculator | Route | What it answers |
|---|---|---|
| Reajuste salarial | `/reajuste-salarial` | What a salary adjustment changes in the net pay, and how much comes as arrears (retroativo), instalment by instalment |

## 🚀 Setup

Node 22 (pinned in `.mise.toml`) and yarn 4 through corepack.

```bash
mise install
corepack enable
yarn install
yarn dev        # http://localhost:12000
```

## 🛠️ Commands

| Command | What it does |
|---|---|
| `yarn dev` | Dev server on port 12000 |
| `yarn build` | Production build |
| `yarn start` | Serves the build on port 12000 |
| `yarn test` | Unit tests of the payroll math (vitest) |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn lint` | eslint |

## 🧱 Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind 3, Radix Popover, lucide icons,
vitest. Light theme only.

## 📅 Every January

The INSS bands and the IRRF table are republished each year. Add the new year's table to
`src/lib/payroll/tax-tables.ts` from the official publications; the calculators refuse a
year they have no table for instead of guessing with last year's numbers.

## ⚠️ Disclaimer

The figures are estimates from the official tables, to check a payslip against. They are
not legal or accounting advice.

## 📚 Documentation

- `CLAUDE.md` — architecture, conventions and how to add a calculator.
- `docs/design/salary-adjustment-mockup.html` — the approved design of the first calculator.

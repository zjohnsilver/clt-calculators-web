'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CALCULATORS } from '@/lib/calculators';
import { cn } from '@/lib/utils';

const SITE_NAME = 'Calculadoras CLT';

/** The 28px mark, centred over a 16px box so it sits on the rail's icon line. */
function Mark() {
  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center">
      <span
        aria-hidden
        className="absolute grid size-7 place-items-center rounded-lg bg-ink font-mono text-sm font-semibold text-paper"
      >
        %
      </span>
    </span>
  );
}

const ROW = 'flex h-control w-full items-center gap-2.5 rounded-[10px] px-3 text-sm font-medium';
/** A rail label: in the page for a screen reader, shown when the rail is open. */
const RAIL_LABEL =
  'truncate opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100';

/**
 * The left rail, from 1024 up: one line per calculator.
 *
 * It opens on hover and on keyboard focus, and there is no button. The `aside` is a
 * fixed 64px slot in the page's row; the panel inside it is absolute and widens OVER
 * the content, so pointing at the edge of the screen never shoves the page sideways.
 * With the rail's `px-3` and each row's `px-3` every icon sits 32px from the edge, the
 * centre of the closed rail, so opening it moves no icon.
 */
function SideRail() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-40 hidden h-screen w-16 shrink-0 lg:block">
      <div className="group absolute inset-y-0 left-0 flex w-16 flex-col gap-4 overflow-hidden border-r border-line bg-paper px-3 py-4 transition-[width] focus-within:w-60 hover:w-60">
        <Link href="/" className={cn(ROW, 'shrink-0 font-display text-base font-semibold text-ink focus-halo')}>
          <Mark />
          <span className={RAIL_LABEL}>{SITE_NAME}</span>
        </Link>

        <nav aria-label="Calculadoras" className="min-h-0 flex-1 overflow-y-auto">
          <ul className="flex flex-col gap-1">
            {CALCULATORS.map((calculator) => {
              const active = pathname.startsWith(calculator.href);
              return (
                <li key={calculator.href}>
                  <Link
                    href={calculator.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      ROW,
                      'transition-colors focus-halo',
                      active ? 'bg-ink text-paper' : 'text-muted hover:bg-hover',
                    )}
                  >
                    <calculator.icon className="size-4 shrink-0" aria-hidden />
                    <span className={RAIL_LABEL}>{calculator.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className={cn(ROW, 'shrink-0 text-[13px] font-normal text-muted')}>
          <Lock className="size-4 shrink-0" aria-hidden />
          <span className={RAIL_LABEL}>Nada sai do seu navegador</span>
        </p>
      </div>
    </aside>
  );
}

/** Below 1024 there is no rail: the name on top and the calculators as a row of tabs. */
function TopBar() {
  const pathname = usePathname();

  return (
    <header className="lg:hidden">
      <Link
        href="/"
        className="flex h-14 items-center gap-3 border-b border-line px-4 font-display text-base font-semibold focus-halo"
      >
        <span className="grid size-7 place-items-center rounded-lg bg-ink font-mono text-sm font-semibold text-paper">
          %
        </span>
        {SITE_NAME}
      </Link>
      <nav aria-label="Calculadoras">
        <ul className="flex gap-1 overflow-x-auto px-4 pt-3">
          {CALCULATORS.map((calculator) => {
            const active = pathname.startsWith(calculator.href);
            return (
              <li key={calculator.href}>
                <Link
                  href={calculator.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-control shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 text-sm font-medium focus-halo',
                    active ? 'bg-ink text-paper' : 'text-muted hover:bg-hover',
                  )}
                >
                  <calculator.icon className="size-4 shrink-0" aria-hidden />
                  {calculator.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SideRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1216px] flex-1 px-4 pb-7 pt-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

'use client';

import * as Popover from '@radix-ui/react-popover';

/**
 * A control's explanation, behind a "?" — never an inline hint line. It opens on a
 * click, so it works the same with a finger as with a mouse.
 */
export function HelpHint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        aria-label={`Ajuda: ${label}`}
        className="inline-grid size-[18px] shrink-0 place-items-center rounded-full border border-line-strong text-[11px] font-semibold text-muted focus-halo hover:bg-hover"
      >
        ?
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 max-w-[280px] rounded-xl border border-line-strong bg-white p-3 text-[13px] font-normal normal-case leading-snug tracking-normal text-ink shadow-[0_8px_24px_rgba(11,11,13,0.12)]"
        >
          {children}
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

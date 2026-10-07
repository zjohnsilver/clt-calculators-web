import { HelpHint } from '@/components/ui/help-hint';
import { cn } from '@/lib/utils';

/** A labelled control. `help` goes behind the "?" beside the label. */
export function Field({
  label,
  htmlFor,
  help,
  small = false,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  help?: React.ReactNode;
  /** The lighter label of a control nested inside another field. */
  small?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col', small ? 'gap-1' : 'gap-1.5', className)}>
      <div className="flex min-h-[18px] items-center gap-1.5">
        <label htmlFor={htmlFor} className={small ? 'text-xs text-muted' : 'text-[13px] font-medium'}>
          {label}
        </label>
        {help ? <HelpHint label={label}>{help}</HelpHint> : null}
      </div>
      {children}
    </div>
  );
}

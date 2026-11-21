import { useId, type ComponentProps, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface TextInputProps extends ComponentProps<'input'> {
  label: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  messagePlacement?: 'below' | 'beside-label';
  trailing?: ReactNode;
}

export function TextInput({
  id, label, icon: Icon, error, hint, messagePlacement = 'below', trailing, className, 'aria-describedby': describedBy, ...input
}: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const message = error || hint;
  const messageId = message ? `${inputId}-message` : undefined;
  const besideLabel = messagePlacement === 'beside-label';
  const feedback = message && (
    <p id={messageId} className={`text-xs ${besideLabel ? 'ms-auto text-end' : 'mt-1.5'} ${error ? 'text-rose-700 dark:text-rose-300' : 'text-zinc-600 dark:text-zinc-400'}`}>
      {message}
    </p>
  );

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <label htmlFor={inputId} className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {label}
        </label>
        {besideLabel && feedback}
      </div>
      <div className={`flex items-center gap-3 rounded-xl border bg-white px-3.5 text-zinc-500 transition focus-within:ring-2 focus-within:ring-violet-500/25 dark:bg-[#191722] ${error ? 'border-rose-500/70' : 'border-zinc-200 focus-within:border-violet-500 dark:border-white/12'}`}>
        {Icon && <Icon aria-hidden="true" className="size-[18px] shrink-0 text-zinc-500 dark:text-zinc-400" />}
        <input
          {...input}
          id={inputId}
          aria-invalid={error ? true : input['aria-invalid']}
          aria-describedby={[describedBy, messageId].filter(Boolean).join(' ') || undefined}
          className={`h-12 min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-500 disabled:opacity-60 dark:text-zinc-100 dark:placeholder:text-zinc-400 ${className ?? ''}`}
        />
        {trailing}
      </div>
      {!besideLabel && feedback}
    </div>
  );
}

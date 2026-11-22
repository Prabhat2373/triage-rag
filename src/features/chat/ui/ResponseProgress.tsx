import { Sparkles } from 'lucide-react';

export function ResponseProgress({ sourceCount }: { sourceCount?: number }) {
  return (
    <div role="status" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-violet-200/70 bg-white/85 px-3 text-sm font-medium text-violet-900 shadow-sm dark:border-violet-400/20 dark:bg-[#252131] dark:text-violet-200">
        <Sparkles aria-hidden="true" className="size-4 text-violet-600 dark:text-violet-300" />
        Thinking<span className="sr-only">…</span>
        <span aria-hidden="true" className="inline-flex items-center gap-1">
          <span className="size-1 rounded-full bg-current motion-safe:animate-bounce" />
          <span className="size-1 rounded-full bg-current motion-safe:animate-bounce [animation-delay:120ms]" />
          <span className="size-1 rounded-full bg-current motion-safe:animate-bounce [animation-delay:240ms]" />
        </span>
      </span>
      {Boolean(sourceCount) && (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {sourceCount} related {sourceCount === 1 ? 'incident' : 'incidents'} found
        </span>
      )}
    </div>
  );
}

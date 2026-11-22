export function ChatHistorySkeleton() {
  const line = 'h-3 rounded-full bg-slate-200 dark:bg-white/10';

  return (
    <div role="status" aria-busy="true" className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f8f9fc] dark:bg-[#1b1924]">
      <span className="sr-only">Loading conversation history</span>
      <div aria-hidden="true" className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-7 overflow-hidden p-4 motion-safe:animate-pulse sm:p-6">
        <div className="ml-auto h-12 w-2/3 max-w-sm shrink-0 rounded-2xl rounded-br-md bg-violet-100 dark:bg-violet-400/15" />
        <div className="flex shrink-0 items-start gap-3">
          <div className="size-9 shrink-0 rounded-xl bg-violet-200 dark:bg-violet-400/20" />
          <div className="min-w-0 flex-1 space-y-3 pt-1">
            <div className={`${line} w-24`} />
            <div className={`${line} mt-4 w-full`} />
            <div className={`${line} w-11/12`} />
            <div className={`${line} w-3/5`} />
          </div>
        </div>
        <div className="ml-auto h-10 w-1/2 max-w-xs shrink-0 rounded-2xl rounded-br-md bg-violet-100 dark:bg-violet-400/15" />
      </div>
      <div aria-hidden="true" className="shrink-0 px-3 pb-3 pt-2 sm:px-6 sm:pb-5">
        <div className="mx-auto flex h-27 max-w-3xl flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/12 dark:bg-[#23202c]">
          <div className={`${line} w-2/5 max-w-48`} />
          <div className="flex items-center justify-between">
            <div className="h-7 w-28 rounded-lg bg-slate-100 dark:bg-white/8" />
            <div className="size-9 rounded-xl bg-slate-100 dark:bg-white/8" />
          </div>
        </div>
      </div>
    </div>
  );
}

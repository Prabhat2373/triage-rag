import { FileCheck2, LoaderCircle, Search } from 'lucide-react';

export function ResponseProgress({ sourceCount }: { sourceCount?: number }) {
  const searching = sourceCount === undefined;
  const title = searching ? 'Searching your knowledge base'
    : sourceCount > 0 ? 'Preparing an answer' : 'Finishing the search';
  const detail = searching ? 'Checking for resolved incidents with similar symptoms.'
    : sourceCount > 0 ? `${sourceCount} related ${sourceCount === 1 ? 'incident' : 'incidents'} found.` : 'No related incidents found.';

  return (
    <div role="status" aria-live="polite" className="mt-2 flex max-w-md items-center gap-3 rounded-2xl border border-violet-200/70 bg-white/85 px-3.5 py-3 shadow-sm dark:border-violet-400/20 dark:bg-[#252131]">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200">
        {searching ? <Search aria-hidden="true" className="size-4" /> : <FileCheck2 aria-hidden="true" className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{detail}</p>
      </div>
      <LoaderCircle aria-hidden="true" className="size-4 shrink-0 text-violet-700 motion-safe:animate-spin dark:text-violet-300" />
    </div>
  );
}

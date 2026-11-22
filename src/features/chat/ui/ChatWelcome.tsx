import Link from 'next/link';
import { ArrowUpRight, AudioWaveform, BookOpen, CreditCard, FileText, Server, ShieldCheck, ShoppingCart } from 'lucide-react';
import type { IncidentSuggestionState } from '../retrieval/suggestions';

const categoryIcons = new Map([
  ['Billing', CreditCard],
  ['Infrastructure', Server],
  ['Authentication', ShieldCheck],
  ['Checkout', ShoppingCart],
]);

export function ChatWelcome({ hasIncidents, suggestions, sample, onPrompt }: IncidentSuggestionState & { sample?: boolean; onPrompt: (query: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-5 sm:py-8">
      <div className="mb-7 sm:mb-9">
        <div className="mb-4 grid size-11 place-items-center rounded-xl bg-violet-700 text-white shadow-sm dark:bg-violet-500/20 dark:text-violet-200">
          <AudioWaveform aria-hidden="true" className="size-5" />
        </div>
        <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl dark:text-white">
          {hasIncidents ? 'What are you investigating?' : 'Start with a resolved incident'}
        </h1>
        <p className="mt-2 max-w-lg text-pretty text-sm leading-6 sm:text-[15px] text-slate-600 dark:text-slate-300">
          {hasIncidents
            ? 'Describe a symptom or share an error code. Find similar incidents and see how they were resolved.'
            : 'Your knowledge base is empty. Add or import resolved incidents so the copilot can find relevant solutions.'}
        </p>
      </div>

      {!hasIncidents && (
        <Link href="/knowledge-base" className="self-start inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">
          <BookOpen aria-hidden="true" className="size-4" /> Open knowledge base
        </Link>
      )}

      {suggestions.length > 0 && (
        <section aria-labelledby="chat-suggestions-title">
          <h2 id="chat-suggestions-title" className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{sample ? 'Try a sample incident' : 'From your recent incidents'}</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {suggestions.map(({ id, title, category, query }) => {
              const Icon = categoryIcons.get(category) ?? FileText;
              return (
                <button key={id} type="button" onClick={() => onPrompt(query)} className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xs transition hover:border-violet-300 hover:bg-violet-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 sm:p-4 dark:border-white/12 dark:bg-[#24212e] dark:hover:border-violet-400/45 dark:hover:bg-[#2b253a]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-400/12 dark:text-violet-200">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    {category && <span className="block break-words text-xs font-medium leading-4 text-slate-600 dark:text-slate-300">{category}</span>}
                    <span className="mt-0.5 block break-words text-sm font-semibold leading-5 text-slate-900 dark:text-white">{title}</span>
                  </span>
                  <ArrowUpRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-slate-500 group-hover:text-violet-700 dark:text-slate-400 dark:group-hover:text-violet-300" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

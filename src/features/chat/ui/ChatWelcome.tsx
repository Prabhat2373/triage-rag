import Link from 'next/link';
import { ArrowUpRight, AudioWaveform, BookOpen, FileText } from 'lucide-react';
import type { IncidentSuggestionState } from '../retrieval/suggestions';

export function ChatWelcome({ hasIncidents, suggestions, sample, onPrompt }: IncidentSuggestionState & { sample?: boolean; onPrompt: (query: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-6 sm:py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border border-violet-200 bg-violet-100/90 text-violet-800 shadow-sm dark:border-violet-400/25 dark:bg-violet-400/15 dark:text-violet-200">
          <AudioWaveform aria-hidden="true" className="size-7" />
        </div>
        <h1 className="text-balance text-[1.625rem] font-semibold leading-tight tracking-tight text-slate-950 sm:text-[2rem] dark:text-white">
          {hasIncidents ? 'What are you investigating?' : 'Start with a resolved incident'}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {hasIncidents
            ? 'Describe what happened. TriageRAG looks for similar incidents and links you to the original reports.'
            : 'Your knowledge base is empty. Add or import resolved incidents so the copilot can find relevant solutions.'}
        </p>
      </div>

      {!hasIncidents && (
        <Link href="/knowledge-base" className="mx-auto inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">
          <BookOpen aria-hidden="true" className="size-4" /> Open knowledge base
        </Link>
      )}

      {suggestions.length > 0 && (
        <section aria-label="Suggested questions from recent incidents">
          <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">{sample ? 'Try a sample incident' : 'From your recent incidents'}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestions.map(({ id, title, category, query }) => (
              <button key={id} type="button" onClick={() => onPrompt(query)} className="group flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-[0_3px_10px_#28144908] transition hover:border-violet-300 hover:bg-violet-50/50 focus-visible:outline-2 focus-visible:outline-violet-500 sm:p-4 dark:border-white/12 dark:bg-[#24212e] dark:hover:border-violet-400/45 dark:hover:bg-[#2b253a]">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-400/12 dark:text-violet-200">
                  <FileText aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
                  {category && <span className="mt-0.5 block break-words text-sm leading-snug text-slate-600 dark:text-slate-300">{category}</span>}
                </span>
                <ArrowUpRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400 group-hover:text-violet-700 dark:group-hover:text-violet-300" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

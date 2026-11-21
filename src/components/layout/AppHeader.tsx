import Link from 'next/link';
import { BookOpen, PanelLeft, Plus, ScanSearch } from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  onOpenSidebar: () => void;
  onOpenMobileSidebar: () => void;
  incidentCount: number;
  onOpenIngest: () => void;
  evidenceCount?: number;
  onToggleEvidence?: () => void;
  evidenceOpen?: boolean;
}

export function AppHeader({
  title, subtitle, sidebarOpen, mobileSidebarOpen, onOpenSidebar, onOpenMobileSidebar,
  incidentCount, onOpenIngest, evidenceCount = 0, onToggleEvidence, evidenceOpen = false,
}: Props) {
  const sidebarButtonStyle = 'size-10 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-slate-300 dark:hover:bg-white/10';

  return (
    <header className="z-20 flex min-h-[72px] shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-3 sm:gap-4 sm:px-6 dark:border-white/10 dark:bg-[#201d29]">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {!mobileSidebarOpen && (
          <button type="button" onClick={onOpenMobileSidebar} aria-label="Open workspace navigation" className={`grid ${sidebarButtonStyle} lg:hidden`}>
            <PanelLeft aria-hidden="true" className="size-5" />
          </button>
        )}
        {!sidebarOpen && (
          <button type="button" onClick={onOpenSidebar} aria-label="Open workspace navigation" className={`hidden ${sidebarButtonStyle} lg:grid`}>
            <PanelLeft aria-hidden="true" className="size-5" />
          </button>
        )}
        <div className="min-w-0">
          <p className="truncate text-[0.9375rem] font-semibold tracking-tight text-slate-950 dark:text-white">{title}</p>
          <p className="truncate text-xs text-slate-600 sm:text-sm dark:text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Link
          href="/knowledge-base"
          aria-label={`Knowledge base, ${incidentCount} resolved incidents`}
          className="hidden min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 sm:inline-flex dark:text-slate-200 dark:hover:bg-white/10"
        >
          <BookOpen aria-hidden="true" className="size-4 text-violet-700 dark:text-violet-300" />
          <span className="hidden xl:inline">Knowledge base</span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums dark:bg-white/10">{incidentCount}</span>
        </Link>
        {onToggleEvidence && (
          <button type="button" onClick={onToggleEvidence} aria-label={`Evidence, ${evidenceCount} sources`} aria-expanded={evidenceOpen} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-violet-500 sm:px-3 ${evidenceOpen ? 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-400/30 dark:bg-violet-400/15 dark:text-violet-200' : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10'}`}>
            <ScanSearch aria-hidden="true" className="size-4" />
            <span className="hidden md:inline">Evidence</span>
            <span className="tabular-nums">{evidenceCount}</span>
          </button>
        )}
        <button type="button" onClick={onOpenIngest} aria-label="Add resolved incident" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-violet-700 px-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 sm:px-3">
          <Plus aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Add incident</span>
        </button>
      </div>
    </header>
  );
}

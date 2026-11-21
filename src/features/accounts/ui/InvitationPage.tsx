import Link from 'next/link';
import { ArrowLeft, MailPlus } from 'lucide-react';
import { AccountForm } from './AccountForm';
import { AccountLayout } from './AccountLayout';

export default function InvitationPage() {
  return (
    <AccountLayout>
      <div className="rounded-[28px] border border-[#e8e4ee] bg-white p-6 shadow-[0_18px_64px_#2814490c] sm:p-7 dark:border-white/10 dark:bg-[#1b1724]">
        <Link href="/login" className="mb-4 inline-flex items-center gap-2 rounded text-sm font-semibold text-violet-700 hover:underline focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-violet-300">
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to sign in
        </Link>
        <div className="mb-3 grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
          <MailPlus aria-hidden="true" className="size-5" />
        </div>
        <h1 className="text-4xl leading-none font-semibold tracking-[-0.065em]">Join your workspace</h1>
        <p className="mt-2 mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Enter your work email and the invitation code your administrator shared with you.
        </p>
        <AccountForm mode="invite" submitLabel="Accept invitation" />
      </div>
    </AccountLayout>
  );
}

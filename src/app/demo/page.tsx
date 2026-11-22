import type { Metadata } from 'next';
import { DemoChat } from '@/features/demo/DemoChat';
import { DEMO_GEMINI_MODEL } from '@/features/demo/answer-request';
import { isDemoMode } from '@/features/demo/config';

export const metadata: Metadata = { title: 'Explore the demo | TriageRAG' };

export default function DemoPage() {
  return <DemoChat modelName={DEMO_GEMINI_MODEL} showSignInLink={!isDemoMode()} />;
}

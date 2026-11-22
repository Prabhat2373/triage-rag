import { isDemoMode } from '@/features/demo/config';
import { redirect } from 'next/navigation';
import SignInPage from '@/features/accounts/ui/SignInPage';

export default function Page() {
  if (isDemoMode()) redirect('/');
  return <SignInPage />;
}

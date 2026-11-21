import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getAuthContext } from './session';

export const requireSettingsAccount = cache(async () => {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  return auth;
});

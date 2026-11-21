'use client';

import { Formik, Form, type FormikErrors } from 'formik';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, KeyRound, LoaderCircle, Mail, UserRound } from 'lucide-react';
import { PasswordField } from '@/components/forms/PasswordField';
import { TextInput } from '@/components/forms/TextInput';
import { acceptInvitation, loginAction, registerAction } from '../actions';

export type AccountMode = 'signin' | 'register' | 'invite';

const initialValues = { email: '', password: '', name: '', organization: '', code: '' };
type AccountValues = typeof initialValues;

function validateAccount(values: AccountValues, mode: AccountMode) {
  const errors: FormikErrors<AccountValues> = {};
  const email = values.email.trim();
  if (!email) errors.email = 'Enter your work email.';
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email.';

  if (!values.password) errors.password = 'Enter your password.';
  else if (values.password.length < 12 || values.password.length > 128) errors.password = 'Use 12 to 128 characters.';

  if (mode === 'register') {
    if (!values.name.trim()) errors.name = 'Enter your name.';
    else if (values.name.length > 120) errors.name = 'Use up to 120 characters.';

    if (!values.organization.trim()) errors.organization = 'Enter an organization name.';
    else if (values.organization.length > 120) errors.organization = 'Use up to 120 characters.';
  }
  if (mode === 'invite' && !/^[A-Za-z0-9_-]{43}$/.test(values.code.trim())) {
    errors.code = values.code.trim() ? 'Paste the full code.' : 'Enter your invitation code.';
  }
  return errors;
}

function submitAccount(values: AccountValues, mode: AccountMode) {
  const email = values.email.trim();
  const { password } = values;
  if (mode === 'invite') return acceptInvitation(email, values.code.trim(), password);
  if (mode === 'register') return registerAction({
    email, password, name: values.name.trim(), orgName: values.organization.trim(),
  });
  return loginAction(email, password);
}

export function AccountForm({ mode, submitLabel }: { mode: AccountMode; submitLabel: string }) {
  const router = useRouter();
  const creatingPassword = mode !== 'signin';

  return (
    <Formik
      initialValues={initialValues}
      validate={(values) => validateAccount(values, mode)}
      onSubmit={async (values, { setStatus }) => {
        setStatus(undefined);
        try {
          const result = await submitAccount(values, mode);
          if (!result.success) {
            setStatus('error' in result ? result.error : 'Unable to continue. Please try again.');
            return;
          }
          router.replace('/');
          router.refresh();
        } catch {
          setStatus('Unable to reach the workspace. Please try again.');
        }
      }}
    >
      {({ getFieldProps, getFieldMeta, isSubmitting, status }) => {
        function field(name: keyof AccountValues) {
          const { touched, error } = getFieldMeta(name);
          return {
            ...getFieldProps(name),
            error: touched ? error : undefined,
            disabled: isSubmitting,
            messagePlacement: 'beside-label' as const,
          };
        }

        return (
          <Form noValidate className="space-y-3">
            {status && (
              <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-2.5 text-sm text-rose-800 dark:text-rose-200">
                {status}
              </p>
            )}
            {mode === 'register' && (
              <>
                <TextInput {...field('name')} label="Full name" icon={UserRound} placeholder="Alex Morgan" autoComplete="name" required />
                <TextInput {...field('organization')} label="Organization name" icon={Building2} placeholder="Acme Engineering" autoComplete="organization" required />
              </>
            )}
            <TextInput {...field('email')} label="Work email" type="email" icon={Mail} placeholder="you@company.com" autoComplete="email" required />
            {mode === 'invite' && (
              <TextInput {...field('code')} label="Invitation code" icon={KeyRound} placeholder="Paste the code you received" autoComplete="off" spellCheck={false} required />
            )}
            <PasswordField
              {...field('password')}
              label={creatingPassword ? 'Create a password' : 'Password'}
              autoComplete={creatingPassword ? 'new-password' : 'current-password'}
              placeholder={creatingPassword ? 'Choose a strong password' : 'Enter your password'}
              hint={creatingPassword ? '12 characters minimum.' : undefined}
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#6938d2] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_#6938d233] transition hover:bg-[#592abc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-wait disabled:opacity-70 dark:bg-[#8051e8] dark:hover:bg-[#6f42d3]"
            >
              {isSubmitting ? 'Please wait…' : submitLabel}
              {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ArrowRight aria-hidden="true" className="size-4" />}
            </button>
          </Form>
        );
      }}
    </Formik>
  );
}

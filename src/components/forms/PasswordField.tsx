'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { TextInput, type TextInputProps } from './TextInput';

type PasswordFieldProps = Omit<TextInputProps, 'type' | 'trailing' | 'label'> & { label?: string };

export function PasswordField({ id, label = 'Password', icon = LockKeyhole, disabled, ...input }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const VisibilityIcon = visible ? EyeOff : Eye;

  return (
    <TextInput
      {...input}
      id={inputId}
      label={label}
      icon={icon}
      disabled={disabled}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-controls={inputId}
          onClick={() => setVisible((current) => !current)}
          className="-mr-2 inline-grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg hover:bg-violet-500/10 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:cursor-default dark:hover:text-violet-300"
        >
          <VisibilityIcon aria-hidden="true" className="size-[18px]" />
        </button>
      }
    />
  );
}

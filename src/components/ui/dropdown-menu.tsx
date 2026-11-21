'use client';

import type { ComponentProps } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuContent({
  className, sideOffset = 6, ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={`z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-xl outline-none dark:border-white/10 dark:bg-[#252231] dark:text-slate-100 ${className ?? ''}`}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return <DropdownMenuPrimitive.Label className={`px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 ${className ?? ''}`} {...props} />;
}

export function DropdownMenuRadioItem({
  className, children, ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={`relative flex min-h-11 select-none items-center rounded-lg py-2 pl-2.5 pr-9 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-violet-50 dark:data-[highlighted]:bg-violet-400/15 ${className ?? ''}`}
      {...props}
    >
      {children}
      <DropdownMenuPrimitive.ItemIndicator className="absolute right-2.5 text-violet-700 dark:text-violet-300">
        <Check aria-hidden="true" className="size-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.RadioItem>
  );
}

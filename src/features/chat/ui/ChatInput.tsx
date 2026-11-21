'use client';

import { useEffect, useRef } from 'react';
import { ArrowUp, ChevronDown, Cpu, Square } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CHAT_MODELS, DEFAULT_CHAT_MODEL, MAX_CHAT_QUERY_LENGTH } from '@/features/chat/types';

interface Props {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export function ChatInput({ input, setInput, onSubmit, onStop, isLoading, selectedModel, onSelectModel }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const model = CHAT_MODELS.find(({ id }) => id === selectedModel) ?? CHAT_MODELS[0];

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 176)}px`;
    }
  }, [input]);

  return (
    <div className="shrink-0 px-3 pb-3 pt-2 sm:px-6 sm:pb-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!isLoading && input.trim()) onSubmit();
        }}
        className="mx-auto w-full max-w-3xl rounded-[24px] border border-slate-200 bg-white p-2.5 shadow-[0_10px_35px_-14px_#35226950] transition focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/15 dark:border-white/12 dark:bg-[#23202c] dark:shadow-black/30 sm:p-3"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          maxLength={MAX_CHAT_QUERY_LENGTH}
          aria-label="Describe an incident"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Describe the incident you’re investigating…"
          className="block min-h-12 w-full resize-none bg-transparent px-2.5 py-2.5 text-base leading-6 sm:text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-400"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />

        <div className="flex items-center justify-between gap-2 px-1 pt-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" disabled={isLoading} aria-label={`Choose AI model, currently ${model.name}`} className="flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-60 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10">
                <Cpu aria-hidden="true" className="size-4 text-violet-600 dark:text-violet-300" />
                <span>{model.name}</span>
                <ChevronDown aria-hidden="true" className="size-3.5 text-slate-500 dark:text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuLabel>Local AI models</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={model.id} onValueChange={onSelectModel}>
                {CHAT_MODELS.map((option) => (
                  <DropdownMenuRadioItem key={option.id} value={option.id}>
                    <span className="flex flex-col">
                      <span className="font-medium">{option.name} {option.id === DEFAULT_CHAT_MODEL && <span className="text-xs text-violet-700 dark:text-violet-300">· Default</span>}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-300">{option.label}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {isLoading ? (
            <button type="button" onClick={onStop} aria-label="Stop response" className="grid size-11 shrink-0 place-items-center rounded-full bg-violet-700 text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">
              <Square aria-hidden="true" className="size-3.5 fill-current" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} aria-label="Send message" className="grid size-11 shrink-0 place-items-center rounded-full bg-violet-700 text-white shadow-sm hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-white/10 dark:disabled:text-slate-400">
              <ArrowUp aria-hidden="true" className="size-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

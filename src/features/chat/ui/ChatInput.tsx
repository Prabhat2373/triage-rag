'use client';

import { useEffect, useRef } from 'react';
import { ArrowUp, ChevronDown, Cpu, Square } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CHAT_MODELS, DEFAULT_CHAT_MODEL, type ChatModelOption } from '../models/catalog';
import { MAX_CHAT_QUERY_LENGTH } from '../types';

interface Props {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
  selectedModel: string;
  modelOptions: ChatModelOption[];
  onSelectModel: (model: string) => void;
}

export function ChatInput({ input, setInput, onSubmit, onStop, isLoading, selectedModel, onSelectModel, modelOptions }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const model = modelOptions.find(({ id }) => id === selectedModel) ?? modelOptions[0];

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
        className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_8px_24px_-14px_#1e293b55] transition focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/15 dark:border-white/12 dark:bg-[#23202c] dark:shadow-black/30 sm:p-2.5"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          maxLength={MAX_CHAT_QUERY_LENGTH}
          aria-label="Describe an incident"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about an incident…"
          className="block min-h-12 w-full resize-none bg-transparent px-2.5 py-2.5 text-base leading-6 sm:text-[15px] text-slate-900 outline-none placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-400"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-1 pt-2 dark:border-white/8">
          {model ? <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" disabled={isLoading} aria-label={`Choose AI model, currently ${model.name}`} className="flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-60 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10">
                <Cpu aria-hidden="true" className="size-4 text-violet-600 dark:text-violet-300" />
                <span>{model.name}</span>
                <ChevronDown aria-hidden="true" className="size-3.5 text-slate-500 dark:text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuLabel>AI models</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={model.id} onValueChange={onSelectModel}>
                {modelOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.id} value={option.id} disabled={!option.available}>
                    <span className="flex flex-col">
                      <span className="font-medium">{option.name} {option.id === DEFAULT_CHAT_MODEL && <span className="text-xs text-violet-700 dark:text-violet-300">· Default</span>}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-300">{option.label}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu> : <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:bg-white/8 dark:text-slate-200"><Cpu aria-hidden="true" className="size-3.5 shrink-0 text-violet-700 dark:text-violet-300" />{CHAT_MODELS.find(({ id }) => id === selectedModel)?.name ?? selectedModel}</span>}

          <span className="hidden text-xs text-slate-600 sm:inline dark:text-slate-300">
            <kbd className="font-sans font-medium">Enter</kbd> to send · <kbd className="font-sans font-medium">Shift + Enter</kbd> for a new line
          </span>
          {isLoading ? (
            <button type="button" onClick={onStop} aria-label="Stop response" className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-700 text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">
              <Square aria-hidden="true" className="size-3.5 fill-current" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} aria-label="Send message" className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-700 text-white shadow-sm hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-white/10 dark:disabled:text-slate-400">
              <ArrowUp aria-hidden="true" className="size-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

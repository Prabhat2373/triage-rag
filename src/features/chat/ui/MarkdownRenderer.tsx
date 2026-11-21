'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  onCitationClick: (code: string) => void;
}

function parseCitations(child: React.ReactNode, onCitationClick: (code: string) => void): React.ReactNode {
  if (typeof child === 'string') {
    const parts = child.split(/(\[(?:TKT|GH)-\d+\])/g);
    if (parts.length === 1) return child;
    return parts.map((part, i) => {
      if (/^\[(?:TKT|GH)-\d+\]$/.test(part)) {
        return (
          <span
            key={i}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onCitationClick(part);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCitationClick(part);
              }
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 font-mono text-[11px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition cursor-pointer select-none"
            title="View resolved incident"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }
  if (Array.isArray(child)) {
    return child.map((c, i) => <React.Fragment key={i}>{parseCitations(c, onCitationClick)}</React.Fragment>);
  }
  if (React.isValidElement(child)) {
    const elementProps = child.props as { children?: React.ReactNode; role?: string };
    if (elementProps?.role === 'button') {
      return child;
    }
    if (elementProps && elementProps.children) {
      return React.cloneElement(child as React.ReactElement<{ children?: React.ReactNode; role?: string }>, {
        children: parseCitations(elementProps.children, onCitationClick),
      });
    }
  }
  return child;
}

export function MarkdownRenderer({ content, onCitationClick }: Props) {
  return (
    <div className="prose dark:prose-invert max-w-none break-words text-sm leading-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-6 text-slate-800 dark:text-slate-200">
              {parseCitations(children, onCitationClick)}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 dark:text-white">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-slate-800 dark:text-slate-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-800 dark:text-slate-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-6 text-slate-800 dark:text-slate-200">
              {parseCitations(children, onCitationClick)}
            </li>
          ),
          pre: ({ children }) => (
            <pre className="my-2.5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-100">
              {children}
            </pre>
          ),
          code: ({ className, children }) => (
            <code className={String(children).includes('\n')
              ? className
              : 'rounded-md bg-slate-200/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-600 dark:bg-white/10 dark:text-indigo-400'}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

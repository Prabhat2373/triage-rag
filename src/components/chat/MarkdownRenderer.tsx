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
    const parts = child.split(/(\[TKT-\d{4}\])/g);
    if (parts.length === 1) return child;
    return parts.map((part, i) => {
      if (/^\[TKT-\d{4}\]$/.test(part)) {
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
            title="View verified post-mortem"
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
      return React.cloneElement(child as React.ReactElement<any>, {
        children: parseCitations(elementProps.children, onCitationClick),
      });
    }
  }
  return child;
}

export function MarkdownRenderer({ content, onCitationClick }: Props) {
  return (
    <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-relaxed text-xs text-slate-800 dark:text-slate-200">
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
            <li className="leading-relaxed text-xs text-slate-800 dark:text-slate-200">
              {parseCitations(children, onCitationClick)}
            </li>
          ),
          code({ inline, className, children, ...props }: any) {
            const isBlock = !inline && String(children).includes('\n');
            if (isBlock) {
              return (
                <pre className="my-2.5 rounded-xl bg-slate-900 dark:bg-black/60 text-slate-100 p-3 overflow-x-auto text-xs font-mono border border-slate-800">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/10 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

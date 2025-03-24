"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypePrism from "rehype-prism-plus";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "~/components/ui/code-block";

type CodeProps = {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
};

type ReactElementWithChildren = {
  props: {
    children: React.ReactNode;
  };
};

function safeStringify(value: React.ReactNode): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(safeStringify).join("");
  if (value === null || value === undefined) return "";
  if (
    typeof value === "object" &&
    value !== null &&
    "props" in value &&
    typeof (value as ReactElementWithChildren).props === "object" &&
    (value as ReactElementWithChildren).props !== null &&
    "children" in (value as ReactElementWithChildren).props
  ) {
    return safeStringify((value as ReactElementWithChildren).props.children);
  }
  return String(value);
}

export function Markdown({ children }: { children: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial client render, show a simplified version
  if (!mounted) {
    return (
      <div className="prose prose-sm dark:prose-invert prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 max-h-full max-w-none [&>p]:my-4 first:[&>p]:mt-0 last:[&>p]:mb-0 [&>p:last-child]:mb-0">
        <div className="font-mono text-sm whitespace-pre-wrap">{children}</div>
      </div>
    );
  }

  // After mounting, show the full markdown with syntax highlighting
  return (
    <div className="prose prose-sm dark:prose-invert prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 max-h-full max-w-none [&>p]:my-4 first:[&>p]:mt-0 last:[&>p]:mb-0 [&>p:last-child]:mb-0">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: CodeProps) {
            const match = /language-(\w+)/.exec(className ?? "");
            const language = match ? match[1] : undefined;
            const content = children ? safeStringify(children) : "";
            return !inline && match ? (
              <CodeBlock language={language} className={className} {...props}>
                {content}
              </CodeBlock>
            ) : (
              <code className={className} {...props}>
                {content}
              </code>
            );
          },
          // Add proper heading styles
          h1: ({ children }) => (
            <h1 className="mt-6 mb-4 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => <h2 className="mt-5 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-4 mb-2">{children}</h3>,
        }}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypePrism, { ignoreMissing: true }]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

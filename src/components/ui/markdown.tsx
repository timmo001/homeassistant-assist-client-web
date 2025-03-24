"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypePrism from "rehype-prism-plus";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "~/components/ui/code-block";
import { H1, H2, H3, H4 } from "~/components/ui/typography";

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

  // Use JSON.stringify to avoid '[object Object]' default stringification
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function Markdown({ children }: { children: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial client render, show a simplified version
  if (!mounted) {
    return (
      <div className="prose prose-sm dark:prose-invert max-h-full max-w-none">
        <div className="font-mono text-sm whitespace-pre-wrap">{children}</div>
      </div>
    );
  }

  // After mounting, show the full markdown with syntax highlighting
  return (
    <div className="prose prose-sm dark:prose-invert max-h-full max-w-none">
      <ReactMarkdown
        components={{
          code({
            node: _node,
            inline,
            className,
            children,
            ...props
          }: CodeProps) {
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
          h1: ({ children, ...props }) => <H1 {...props}>{children}</H1>,
          h2: ({ children, ...props }) => <H2 {...props}>{children}</H2>,
          h3: ({ children, ...props }) => <H3 {...props}>{children}</H3>,
          h4: ({ children, ...props }) => <H4 {...props}>{children}</H4>,
        }}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypePrism, { ignoreMissing: true }]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

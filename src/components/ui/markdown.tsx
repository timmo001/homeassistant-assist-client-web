import ReactMarkdown from "react-markdown";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert dark:prose-invert prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 max-h-full max-w-none [&>p]:my-4 first:[&>p]:mt-0 last:[&>p]:mb-0 [&>p:last-child]:mb-0">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

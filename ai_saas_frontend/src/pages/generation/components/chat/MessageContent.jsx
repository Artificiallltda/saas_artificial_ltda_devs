import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Clipboard } from "lucide-react";

function MessageContent({ content, isUserMessage = false }) {
  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
  };

  // Cor do texto: branco se for do usuário, neutro se IA
  const textColor = isUserMessage
    ? "text-white"
    : "text-gray-800 dark:text-neutral-100";

  const renderedMarkdown = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => (
            <p className={`mb-3 leading-relaxed ${textColor}`}>{children}</p>
          ),

          ol: ({ children }) => (
            <ol
              className={`ml-6 mb-3 space-y-1 list-decimal marker:font-bold marker:text-[var(--color-primary)] ${textColor}`}
            >
              {children}
            </ol>
          ),

          ul: ({ children }) => (
            <ul className={`list-disc list-outside ml-6 mb-3 space-y-1 ${textColor}`}>
              {children}
            </ul>
          ),

          li: ({ children }) => (
            <li className={`leading-relaxed ${textColor}`}>{children}</li>
          ),

          hr: () => (
            <hr className="my-6 border-t-2 border-gray-300 dark:border-neutral-800 rounded" />
          ),

          code({ inline, className, children }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");

            if (!inline && match) {
              return (
                <div className="relative my-5">
                  <button
                    onClick={() => copyToClipboard(codeString)}
                    className="
                      absolute top-2 right-2 p-1 rounded-lg
                      bg-gray-800 text-white text-xs
                      hover:bg-gray-700 transition
                      flex items-center gap-1
                      dark:bg-neutral-950 dark:hover:bg-neutral-800
                      border border-white/10 dark:border-neutral-800
                    "
                    type="button"
                  >
                    <Clipboard className="w-4 h-4" /> Copiar
                  </button>

                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-xl !p-5 !text-sm !leading-relaxed bg-gray-900"
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code
                className="
                  px-1.5 py-0.5 rounded text-sm
                  bg-gray-100 text-gray-800
                  dark:bg-neutral-950 dark:text-neutral-100
                  border border-transparent dark:border-neutral-800
                "
              >
                {children}
              </code>
            );
          },

          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--color-primary)]">
              {children}
            </strong>
          ),

          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-300 dark:border-neutral-800 text-sm border-collapse">
                {children}
              </table>
            </div>
          ),

          thead: ({ children }) => (
            <thead className="bg-gray-100 dark:bg-neutral-900">{children}</thead>
          ),

          th: ({ children }) => (
            <th className="border border-gray-300 dark:border-neutral-800 px-3 py-2 text-left font-medium text-gray-900 dark:text-neutral-100">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="border border-gray-300 dark:border-neutral-800 px-3 py-2 align-top text-gray-800 dark:text-neutral-200">
              {children}
            </td>
          ),

          tr: ({ children }) => (
            <tr className="even:bg-gray-50 dark:even:bg-neutral-900/60">
              {children}
            </tr>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    ),
    [content, textColor]
  );

  return renderedMarkdown;
}

export default React.memo(MessageContent);
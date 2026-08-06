"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Highlight, themes } from "prism-react-renderer";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  filename?: string;
}

export function CodeBlock({ code, language = "typescript", className, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group relative rounded-xl overflow-hidden border border-border bg-muted/50", className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/80">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-xs font-mono text-muted-foreground">{filename}</span>
          )}
          {!filename && (
            <span className="text-xs font-mono text-muted-foreground capitalize">{language}</span>
          )}
        </div>
        <button
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-accent"
        >
          {copied ? (
            <>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5 text-green-500" strokeWidth={1.5} />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Copy01Icon} className="size-3.5" strokeWidth={1.5} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code area */}
      <Highlight theme={themes.vsDark} code={code.trim()} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={cn("overflow-x-auto p-4 text-sm leading-relaxed", className)} style={style}>
            <code className="font-mono text-foreground/90">
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}

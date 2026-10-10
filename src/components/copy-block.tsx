"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Monospace snippet with a copy button in the corner. */
export function CopyBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="group relative">
        <pre className="overflow-x-auto rounded-lg border border-border bg-card p-3 pr-12 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {text}
        </pre>
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-1.5 right-1.5 text-muted-foreground"
          aria-label={copied ? "Copied" : `Copy ${title}`}
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </section>
  );
}

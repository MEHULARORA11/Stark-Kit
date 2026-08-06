import { cn } from "@/lib/utils";

interface DocPageProps {
  children: React.ReactNode;
  className?: string;
}

export function DocPage({ children, className }: DocPageProps) {
  return (
    <article
      className={cn(
        "mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14",
        className
      )}
    >
      {children}
    </article>
  );
}

export function DocH1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
      {children}
    </h1>
  );
}

export function DocH2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="mt-12 mb-4 scroll-mt-20 font-heading text-xl font-semibold text-foreground first:mt-0"
    >
      {children}
    </h2>
  );
}

export function DocH3({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      className="mt-8 mb-3 scroll-mt-20 font-heading text-base font-semibold text-foreground"
    >
      {children}
    </h3>
  );
}

export function DocLead({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
      {children}
    </p>
  );
}

export function DocP({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
      {children}
    </p>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

export function DocCallout({
  children,
  type = "note",
}: {
  children: React.ReactNode;
  type?: "note" | "tip" | "warning";
}) {
  const styles = {
    note: "border-blue-200 bg-blue-50/50 text-blue-900 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-300",
    tip: "border-green-200 bg-green-50/50 text-green-900 dark:border-green-800/40 dark:bg-green-950/30 dark:text-green-300",
    warning:
      "border-amber-200 bg-amber-50/50 text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300",
  };
  const labels = { note: "Note", tip: "Tip", warning: "Warning" };
  return (
    <div className={cn("mt-6 rounded-lg border p-4 text-sm leading-relaxed", styles[type])}>
      <span className="font-semibold">{labels[type]}: </span>
      {children}
    </div>
  );
}

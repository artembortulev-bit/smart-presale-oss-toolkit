import { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/shared/utils/cn";
import { cleanDisplayText } from "@/shared/utils/display-text";

type Tone = "default" | "accent" | "dark" | "success" | "warning" | "danger" | "muted";

function cleanNode(node: ReactNode): ReactNode {
  if (typeof node === "string") {
    return cleanDisplayText(node);
  }

  if (Array.isArray(node)) {
    return node.map(cleanNode);
  }

  return node;
}

export function Eyebrow({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <p
      className={cn(
        "ui-eyebrow font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--foreground-soft)]",
        className,
      )}
    >
      {cleanNode(children)}
    </p>
  );
}

export function Stage({
  children,
  className,
  tone = "light",
}: PropsWithChildren<{ className?: string; tone?: "light" | "dark" | "warm" }>) {
  return (
    <section
      className={cn(
        "visual-stage relative overflow-hidden rounded-[8px] p-5 sm:p-7 lg:p-8",
        tone === "dark" && "premium-stage--dark text-white",
        tone === "warm" && "premium-stage--warm",
        className,
      )}
    >
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function ProofPanel({
  children,
  className,
  dark,
}: PropsWithChildren<{ className?: string; dark?: boolean }>) {
  return (
    <div
      className={cn(
        "proof-panel min-w-0 rounded-[8px] p-5 sm:p-6",
        dark && "proof-panel--dark text-white",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Pill({
  children,
  tone = "default",
  className,
}: PropsWithChildren<{ tone?: Tone; className?: string }>) {
  const tones: Record<Tone, string> = {
    default: "border-[var(--border)] bg-white/75 text-[var(--foreground)]",
    accent: "border-[rgba(239,100,29,0.22)] bg-[rgba(239,100,29,0.12)] text-[var(--accent)]",
    dark: "border-[rgba(23,20,18,0.12)] bg-[var(--surface-dark)] text-white",
    success: "border-emerald-100 bg-emerald-50 text-emerald-800",
    warning: "border-amber-100 bg-amber-50 text-amber-800",
    danger: "border-red-100 bg-red-50 text-red-800",
    muted: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-muted)]",
  };

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-[8px] border px-3 py-1.5 text-xs font-semibold leading-none",
        tones[tone],
        className,
      )}
    >
      {cleanNode(children)}
    </span>
  );
}

export function MetricBlock({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("metric-block min-w-0 rounded-[8px] px-4 py-4", className)}>
      <Eyebrow>{label}</Eyebrow>
      <div className="safe-text mt-2 text-[1.65rem] font-semibold leading-[1.02] tracking-[-0.05em] text-[var(--foreground)]">
        {cleanNode(value)}
      </div>
      {hint ? (
        <div className="safe-text mt-2 text-xs leading-5 text-[var(--foreground-muted)]">
          {cleanNode(hint)}
        </div>
      ) : null}
    </div>
  );
}

export function CommandStrip({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "command-strip flex flex-wrap items-center gap-3 rounded-[8px] px-3 py-3 sm:px-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-end justify-between gap-5", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2 className="safe-heading mt-3 text-[clamp(2rem,4vw,4.2rem)] font-semibold leading-[1.02] tracking-normal text-[var(--foreground)]">
          {cleanDisplayText(title)}
        </h2>
        {description ? (
          <p className="safe-text mt-4 text-base leading-8 text-[var(--foreground-muted)]">
            {cleanDisplayText(description)}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function DocumentBlock({
  title,
  number,
  amount,
  status,
  children,
}: PropsWithChildren<{
  title: string;
  number?: string;
  amount?: string;
  status?: ReactNode;
}>) {
  return (
    <div className="document-block min-w-0 rounded-[8px] p-5 sm:p-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>{number ?? "Коммерческий документ"}</Eyebrow>
          <h3 className="safe-heading mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
            {cleanDisplayText(title)}
          </h3>
          {amount ? (
            <div className="safe-text mt-3 text-[2rem] font-semibold tracking-[-0.06em] text-[var(--foreground)]">
              {cleanDisplayText(amount)}
            </div>
          ) : null}
        </div>
        {status}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

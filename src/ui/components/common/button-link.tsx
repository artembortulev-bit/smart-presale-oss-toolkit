import Link from "next/link";
import { PropsWithChildren } from "react";

import { cn } from "@/shared/utils/cn";
import { cleanDisplayText } from "@/shared/utils/display-text";

type ButtonLinkProps = PropsWithChildren<{
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  target?: string;
  rel?: string;
}>;

export function ButtonLink({
  children,
  variant = "primary",
  className,
  href,
  target,
  rel,
}: ButtonLinkProps) {
  return (
    <Link
      href={href as never}
      target={target}
      rel={rel}
      className={cn(
        "inline-flex items-center justify-center rounded-[8px] px-5 py-3 text-sm font-semibold tracking-[0.01em] whitespace-nowrap transition-all duration-300 active:translate-y-[1px] active:scale-[0.99]",
        variant === "primary" &&
          "bg-[#c85f27] text-white shadow-[0_18px_46px_rgba(200,95,39,0.18)] hover:-translate-y-0.5 hover:bg-[#b95422] hover:shadow-[0_24px_60px_rgba(200,95,39,0.24)]",
        variant === "secondary" &&
          "border border-[#181512]/10 bg-white/82 text-[#181512] shadow-[0_10px_30px_rgba(24,21,18,0.045)] backdrop-blur-xl hover:-translate-y-0.5 hover:border-[#c85f27]/30 hover:bg-white",
        variant === "ghost" &&
          "bg-transparent text-[var(--foreground-muted)] hover:bg-white/54 hover:text-[var(--foreground)]",
        className,
      )}
    >
      {typeof children === "string" ? cleanDisplayText(children) : children}
    </Link>
  );
}

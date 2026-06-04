"use client";

import { useFormStatus } from "react-dom";

import { cleanDisplayText } from "@/shared/utils/display-text";

type ActionSubmitButtonProps = {
  children: string;
  className?: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
};

const variantClasses = {
  primary:
    "bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] text-white shadow-[0_18px_48px_rgba(239,100,29,0.22)]",
  secondary:
    "border border-[rgba(23,20,18,0.1)] bg-[rgba(255,255,255,0.78)] text-[var(--foreground)]",
  danger: "border border-red-200 bg-red-50 text-red-700",
};

export function ActionSubmitButton({
  children,
  className = "",
  pendingLabel = "Выполняю...",
  variant = "secondary",
}: ActionSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      data-pending={pending ? "true" : "false"}
      className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
    >
      {cleanDisplayText(pending ? pendingLabel : children)}
    </button>
  );
}

"use client";
/* eslint-disable @next/next/no-img-element */

import { ComponentPropsWithoutRef, ReactNode, useState } from "react";

import { cn } from "@/shared/utils/cn";

type CatalogMediaImageProps = Omit<ComponentPropsWithoutRef<"img">, "src"> & {
  src?: string;
  fallback?: ReactNode;
};

export function CatalogMediaImage({
  src,
  alt,
  className,
  fallback,
  onError,
  ...props
}: CatalogMediaImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-[var(--surface-muted)] px-6 text-center text-sm text-[var(--foreground-muted)]">
        Изображение временно недоступно
      </div>
    );
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      className={cn("h-full w-full", className)}
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
    />
  );
}

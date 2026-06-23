import { useState } from "react";
import { cn } from "@/lib/utils";

/** A premium shimmer placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "skeleton-shimmer rounded-md bg-[color-mix(in_oklab,var(--gold)_5%,var(--secondary))]",
        className,
      )}
    />
  );
}

/**
 * Image that shows a gold shimmer skeleton until the asset has loaded,
 * then fades in. Keeps perceived performance high on slow connections.
 */
export function ImageWithSkeleton({
  src,
  alt,
  className,
  imgClassName,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={cn("relative block overflow-hidden", className)}>
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-700 ease-out motion-reduce:transition-none",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
      />
    </span>
  );
}

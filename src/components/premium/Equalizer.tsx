export function Equalizer({ active = true }: { active?: boolean }) {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[2px] origin-bottom rounded-full bg-gold"
          style={{
            height: "100%",
            animation: active ? `equalize 0.9s ease-in-out ${i * 0.15}s infinite` : "none",
            transform: active ? undefined : "scaleY(0.3)",
          }}
        />
      ))}
    </span>
  );
}

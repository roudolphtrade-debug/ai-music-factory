import { DemoBadge } from "@/components/premium/DemoBadge";
import { useDemoHonesty, type DemoHonesty } from "@/i18n/demo-honesty";
import { cn } from "@/lib/utils";

/** One line that says plainly that what follows is an example, never a measurement. */
export function DemoNotice({
  kind = "demoContent",
  className,
  id,
}: {
  kind?: keyof Pick<DemoHonesty, "demoStats" | "demoContent" | "demoProfile">;
  className?: string;
  id?: string;
}) {
  const h = useDemoHonesty();
  return (
    <p
      id={id}
      role="note"
      className={cn("flex flex-wrap items-center gap-2 text-xs text-muted-foreground", className)}
    >
      <DemoBadge />
      <span>{h[kind]}</span>
    </p>
  );
}

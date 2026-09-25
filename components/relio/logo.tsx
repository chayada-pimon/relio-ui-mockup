import { cn } from "@/lib/utils"

// Text-only wordmark for now; swap for the master logo file once it is in /public.
export function RelioLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[22px] leading-none font-bold tracking-[-0.02em]",
        className
      )}
      style={{ color: "var(--logo-ink)" }}
    >
      CRM
    </span>
  )
}

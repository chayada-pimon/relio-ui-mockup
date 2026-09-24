import { cn } from "@/lib/utils"

// Placeholder drawing of the RELIO mark (Aqua bubble behind, Blue bubble in
// front, navy wordmark). Swap for the master file
// "logo/Relio Logo - Horizontal - Full Color.svg" once it is in /public.
export function RelioLogo({
  className,
  markOnly = false,
}: {
  className?: string
  markOnly?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width="32"
        height="28"
        viewBox="0 0 32 28"
        aria-hidden
        className="shrink-0"
      >
        <path
          d="M4 2h14a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H10l-5 4v-4H4a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z"
          fill="#087F8C"
        />
        <path
          d="M14 8h14a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-1v4l-5-4h-8a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4Z"
          fill="#1463D6"
        />
        <rect x="18" y="14" width="10" height="2" rx="1" fill="#fff" />
        <rect x="18" y="18" width="6" height="2" rx="1" fill="#FC9433" />
      </svg>
      {!markOnly && (
        <span
          className="text-[22px] leading-none font-bold tracking-[-0.02em]"
          style={{ color: "var(--logo-ink)" }}
        >
          RELIO
        </span>
      )}
      {markOnly && <span className="sr-only">RELIO</span>}
    </span>
  )
}

import { AppShell } from "@/components/relio/app-shell"
import { RangeProvider } from "@/components/relio/range"

export default function RelioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RangeProvider>
      <AppShell>{children}</AppShell>
    </RangeProvider>
  )
}

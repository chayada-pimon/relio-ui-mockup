import { AppShell } from "@/components/relio/app-shell"

export default function RelioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}

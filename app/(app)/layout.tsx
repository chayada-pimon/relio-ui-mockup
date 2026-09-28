import { PortalShell } from "@/components/portal/shell"

export default function PortalAppLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>
}

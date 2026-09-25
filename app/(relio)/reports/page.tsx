"use client"

import { useLang } from "@/lib/relio/i18n"
import { PageHeader } from "@/components/relio/ui"
import { TrendsPanel } from "@/components/relio/dashboard"

export default function ReportsPage() {
  const { t } = useLang()
  return (
    <>
      <PageHeader
        title={t("navReports")}
        description={t("reportsSub")}
      />
      <TrendsPanel />
    </>
  )
}

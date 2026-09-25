"use client"

import { useLang } from "@/lib/relio/i18n"
import { PageHeader } from "@/components/relio/ui"
import { CustomerInsights } from "@/components/relio/dashboard"

export default function InsightsPage() {
  const { t } = useLang()
  return (
    <>
      <PageHeader
        title={t("navInsights")}
        description={t("insightsSub")}
      />
      <CustomerInsights />
    </>
  )
}

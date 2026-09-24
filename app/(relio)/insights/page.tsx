"use client"

import * as React from "react"

import { useLang } from "@/lib/relio/i18n"
import type { Range } from "@/lib/relio/dashboard"
import { PageHeader } from "@/components/relio/ui"
import { CustomerInsights, RangeFilter } from "@/components/relio/dashboard"

export default function InsightsPage() {
  const { t } = useLang()
  const [range, setRange] = React.useState<Range>("30d")
  return (
    <>
      <PageHeader
        title={t("navInsights")}
        description={t("insightsSub")}
        actions={<RangeFilter range={range} onChange={setRange} />}
      />
      <CustomerInsights range={range} />
    </>
  )
}

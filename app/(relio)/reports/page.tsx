"use client"

import * as React from "react"

import { useLang } from "@/lib/relio/i18n"
import type { Range } from "@/lib/relio/dashboard"
import { PageHeader } from "@/components/relio/ui"
import { RangeFilter, TrendsPanel } from "@/components/relio/dashboard"

export default function ReportsPage() {
  const { t } = useLang()
  const [range, setRange] = React.useState<Range>("30d")
  return (
    <>
      <PageHeader
        title={t("navReports")}
        description={t("reportsSub")}
        actions={<RangeFilter range={range} onChange={setRange} />}
      />
      <TrendsPanel range={range} />
    </>
  )
}

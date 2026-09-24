"use client"

import { useLang } from "@/lib/relio/i18n"
import { PageHeader } from "@/components/relio/ui"
import { OperationsPanel } from "@/components/relio/dashboard"

export default function OperationsPage() {
  const { t } = useLang()
  return (
    <>
      <PageHeader title={t("navOperations")} description={t("operationsSub")} />
      <OperationsPanel />
    </>
  )
}

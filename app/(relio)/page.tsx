"use client"

import { Plus } from "@phosphor-icons/react"

import { useLang } from "@/lib/relio/i18n"
import { ButtonLink, PageHeader } from "@/components/relio/ui"
import { Dashboard } from "@/components/relio/dashboard"

export default function OverviewPage() {
  const { t } = useLang()
  return (
    <>
      <PageHeader
        title={t("greeting")}
        description={t("overviewSub")}
        actions={
          <ButtonLink href="/orders/new" variant="primary" icon={Plus}>
            {t("newOrder")}
          </ButtonLink>
        }
      />
      <Dashboard />
    </>
  )
}

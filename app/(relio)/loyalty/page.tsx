"use client"

import { useLang } from "@/lib/relio/i18n"
import { PageHeader } from "@/components/relio/ui"
import { LoyaltyPanel } from "@/components/relio/dashboard"

export default function LoyaltyPage() {
  const { t } = useLang()
  return (
    <>
      <PageHeader title={t("navLoyalty")} description={t("loyaltySub")} />
      <LoyaltyPanel />
    </>
  )
}

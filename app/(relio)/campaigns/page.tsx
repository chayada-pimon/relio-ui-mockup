"use client"

import { useLang } from "@/lib/relio/i18n"
import { PageHeader } from "@/components/relio/ui"
import { CampaignsPanel } from "@/components/relio/dashboard"

export default function CampaignsPage() {
  const { t } = useLang()
  return (
    <>
      <PageHeader title={t("navCampaigns")} description={t("campaignsSub")} />
      <CampaignsPanel />
    </>
  )
}

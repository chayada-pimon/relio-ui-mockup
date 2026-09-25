"use client"

import { Plus } from "@phosphor-icons/react"

import { useLang } from "@/lib/relio/i18n"
import { ButtonLink, PageHeader } from "@/components/relio/ui"
import { CampaignsPanel } from "@/components/relio/dashboard"

export default function CampaignsPage() {
  const { t } = useLang()
  return (
    <>
      <PageHeader
        title={t("navCampaigns")}
        description={t("campaignsSub")}
        actions={
          <ButtonLink href="/campaigns/new" variant="primary" icon={Plus}>
            {t("newCampaign")}
          </ButtonLink>
        }
      />
      <CampaignsPanel />
    </>
  )
}

"use client"

import { MagnifyingGlass } from "@phosphor-icons/react"

import { useLang } from "@/lib/relio/i18n"
import { ButtonLink, Card, EmptyState } from "@/components/relio/ui"

export function NotFound({
  backHref,
  backLabel,
}: {
  backHref: string
  backLabel: string
}) {
  const { t } = useLang()
  return (
    <Card>
      <EmptyState
        icon={MagnifyingGlass}
        title={t("notFoundTitle")}
        body={t("notFoundBody")}
        action={
          <ButtonLink href={backHref} variant="primary">
            {backLabel}
          </ButtonLink>
        }
      />
    </Card>
  )
}

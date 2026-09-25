"use client"

import { useParams } from "next/navigation"

import { useLang } from "@/lib/relio/i18n"
import { getCustomer } from "@/lib/relio/data"
import { CustomerForm } from "@/components/relio/customer-form"
import { NotFound } from "@/components/relio/not-found"

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useLang()
  const customer = getCustomer(id)

  if (!customer)
    return <NotFound backHref="/customers" backLabel={t("backToCustomers")} />

  return <CustomerForm key={customer.id} customer={customer} />
}

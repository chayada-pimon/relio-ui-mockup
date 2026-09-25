"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowsMerge, UserPlus, UsersThree } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang, type DictKey } from "@/lib/relio/i18n"
import {
  customerStats,
  customers,
  daysSince,
  type Segment,
  maskEmail,
  mergeCandidates,
  maskPhone,
} from "@/lib/relio/data"
import {
  Avatar,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  SegmentChip,
  SearchInput,
} from "@/components/relio/ui"

const filters: { value: Segment | "all"; label: DictKey }[] = [
  { value: "all", label: "filterAll" },
  { value: "vip", label: "segVip" },
  { value: "regular", label: "segRegular" },
  { value: "new", label: "segNew" },
]

function CustomersView() {
  const { t, money, date } = useLang()
  const params = useSearchParams()
  const [query, setQuery] = React.useState(params.get("q") ?? "")
  const [segment, setSegment] = React.useState<Segment | "all">("all")

  React.useEffect(() => setQuery(params.get("q") ?? ""), [params])

  const q = query.trim().toLowerCase()
  const rows = customers.filter(
    (c) =>
      (segment === "all" || c.segment === segment) &&
      (!q ||
        [c.name, c.company, c.phone, c.email, c.id].some((f) =>
          f.toLowerCase().includes(q)
        ))
  )

  return (
    <>
      <PageHeader
        title={t("customersTitle")}
        description={t("customersSub")}
        actions={
          <>
            <ButtonLink href="/customers/merge" icon={ArrowsMerge}>
              {t("mergeDuplicates")}
              <span className="tabular inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-warning-soft px-1.5 text-xs font-semibold text-warning">
                {mergeCandidates.length}
              </span>
            </ButtonLink>
            <ButtonLink href="/customers/new" variant="primary" icon={UserPlus}>
              {t("addCustomer")}
            </ButtonLink>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          role="group"
          aria-label={t("colSegment")}
          className="flex flex-wrap gap-2"
        >
          {filters.map((f) => {
            const count =
              f.value === "all"
                ? customers.length
                : customers.filter((c) => c.segment === f.value).length
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={segment === f.value}
                onClick={() => setSegment(f.value)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-[120ms]",
                  segment === f.value
                    ? "border-crm bg-crm-soft text-crm-on-soft"
                    : "border-line bg-surface text-content-secondary hover:bg-hover hover:text-content"
                )}
              >
                {t(f.label)}
                <span className="tabular text-xs">{count}</span>
              </button>
            )
          })}
        </div>
        <SearchInput
          id="customer-search"
          label={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="md:w-[300px]"
        />
      </div>

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={UsersThree}
            title={t("emptyCustomersTitle")}
            body={t("emptyCustomersBody")}
            action={
              <ButtonLink href="/customers/new" variant="primary" icon={UserPlus}>
                {t("addCustomer")}
              </ButtonLink>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-left text-sm lg:table">
              <thead className="border-b border-line bg-raised text-xs text-content-secondary">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">
                    {t("colCustomer")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("colContact")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("colSegment")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    {t("colOrders")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    {t("colSpent")}
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
                    {t("colLastContact")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const stats = customerStats(c.id)
                  return (
                    <tr
                      key={c.id}
                      className="group relative border-b border-line last:border-0 hover:bg-raised"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} />
                          <div className="min-w-0">
                            <Link
                              href={`/customers/${c.id}`}
                              className="font-semibold group-hover:text-crm after:absolute after:inset-0"
                            >
                              {c.name}
                            </Link>
                            <p className="text-xs leading-[1.5] text-content-quiet">
                              {c.company}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="tabular">{maskPhone(c.phone)}</p>
                        <p className="text-xs leading-[1.5] text-content-quiet">
                          {maskEmail(c.email)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <SegmentChip segment={c.segment} />
                      </td>
                      <td className="tabular px-4 py-3 text-right">
                        {stats.orders}
                      </td>
                      <td className="tabular px-4 py-3 text-right font-semibold">
                        {money(stats.spent)}
                      </td>
                      <td className="px-6 py-3">
                        <p>{date(c.lastContact)}</p>
                        <p className="text-xs leading-[1.5] text-content-quiet">
                          {daysSince(c.lastContact) === 0
                            ? t("today")
                            : `${daysSince(c.lastContact)} ${t("daysAgo")}`}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile / tablet list */}
            <ul className="lg:hidden">
              {rows.map((c) => {
                const stats = customerStats(c.id)
                return (
                  <li key={c.id} className="border-b border-line last:border-0">
                    <Link
                      href={`/customers/${c.id}`}
                      className="flex items-center gap-3 px-5 py-4 hover:bg-raised"
                    >
                      <Avatar name={c.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {c.name}
                        </p>
                        <p className="truncate text-xs leading-[1.5] text-content-quiet">
                          {c.company} · {stats.orders} {t("colOrders")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="tabular text-sm font-semibold">
                          {money(stats.spent)}
                        </span>
                        <SegmentChip segment={c.segment} />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>
    </>
  )
}

export default function CustomersPage() {
  return (
    <React.Suspense>
      <CustomersView />
    </React.Suspense>
  )
}

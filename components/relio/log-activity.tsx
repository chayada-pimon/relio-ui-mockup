"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Check, X } from "@phosphor-icons/react"

import { useLang } from "@/lib/relio/i18n"
import { logActivity, type LoggableKind } from "@/lib/relio/activity-store"
import {
  Button,
  Field,
  IconButton,
  Select,
  inputClass,
} from "@/components/relio/ui"
import { cn } from "@/lib/utils"

const kinds: { value: LoggableKind; label: "actCall" | "actChat" | "actNote" }[] =
  [
    { value: "call", label: "actCall" },
    { value: "chat", label: "actChat" },
    { value: "note", label: "actNote" },
  ]

export function LogActivityDialog({
  open,
  onOpenChange,
  customerId,
  onLogged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  onLogged: () => void
}) {
  const { t } = useLang()
  const [kind, setKind] = React.useState<LoggableKind>("call")
  const [text, setText] = React.useState("")
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setKind("call")
    setText("")
    setError(false)
  }, [open])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value) {
      setError(true)
      return
    }
    logActivity(customerId, kind, value)
    onOpenChange(false)
    onLogged()
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-line bg-surface text-content shadow-xl transition-[opacity,transform] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0">
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-line py-2 pr-2 pl-6">
              <Dialog.Title className="text-lg leading-[1.4] font-semibold">
                {t("logActivity")}
              </Dialog.Title>
              <Dialog.Close
                render={<IconButton icon={X} label={t("cancel")} />}
              />
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto p-6">
              <Field label={t("activityKind")} htmlFor="act-kind">
                <Select
                  id="act-kind"
                  value={kind}
                  onValueChange={(v) => setKind(v as LoggableKind)}
                  options={kinds.map((k) => ({
                    value: k.value,
                    label: t(k.label),
                  }))}
                />
              </Field>
              <Field
                label={t("activityDetail")}
                htmlFor="act-text"
                error={error ? t("activityRequired") : undefined}
              >
                <textarea
                  id="act-text"
                  rows={4}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                    if (error) setError(false)
                  }}
                  placeholder={t("activityPlaceholder")}
                  aria-invalid={error || undefined}
                  aria-describedby={error ? "act-text-msg" : undefined}
                  className={cn(inputClass, "py-2.5 leading-[1.6]")}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
              <Dialog.Close render={<Button>{t("cancel")}</Button>} />
              <Button type="submit" variant="primary" icon={Check}>
                {t("activitySave")}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

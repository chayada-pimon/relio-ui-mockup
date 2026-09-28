"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Check, Eye, EyeSlash } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { usePortal } from "@/lib/portal/store"
import { Alert } from "@/components/portal/ui"

// Split card: illustration panel on the left (hidden on small screens),
// underline-style form on the right.

const underline =
  "h-10 w-full border-0 border-b border-line bg-transparent px-0 text-base text-content outline-none transition-colors duration-[120ms] placeholder:text-content-quiet hover:border-control focus-visible:border-content md:text-sm"

function UnderlineField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={htmlFor} className="text-xs text-content-quiet">
        {label}
      </label>
      {children}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = usePortal()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [remember, setRemember] = React.useState(true)
  const [error, setError] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)

  // No auto-redirect when a session already exists (it persists in
  // localStorage), otherwise this page could never be reached again.
  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNotice(null)
    // One message for every failure: the portal never says which field was
    // wrong, and 5 failures lock the account for 15 minutes.
    if (login(email, password)) router.replace("/")
    else setError(true)
  }

  // Mockup SSO: there is no OAuth backend, so a provider button signs in as
  // the seeded super_admin (same as the empty-form demo shortcut).
  function onSocial() {
    setNotice(null)
    if (login("", "")) router.replace("/")
    else setError(true)
  }

  return (
    <div className="min-h-dvh overflow-hidden bg-surface text-content lg:h-dvh">
      <div className="grid min-h-dvh animate-[relio-fade_320ms_var(--ease-out-soft,ease-out)] grid-rows-[auto_1fr] lg:h-dvh lg:grid-cols-[1.1fr_1fr] lg:grid-rows-1">
        {/* Illustration: runs under the form panel (below it on mobile, beside
            it on desktop) so the panel's rounded corners sit on blue. */}
        <div className="relative -mb-6 overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#8ab8ff_0%,#3f86f5_45%,#1655d6_100%)] lg:-mr-8 lg:mb-0 lg:min-h-0">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.12)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.12)_1px,transparent_1px)] [mask-image:radial-gradient(90%_80%_at_50%_40%,black,transparent)] bg-[size:56px_56px]"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-[50%] bg-[#7facff]/40 blur-3xl"
          />
          <div className="relative flex h-full flex-col justify-between gap-5 px-6 pt-8 pb-16 sm:px-10 lg:gap-8 lg:p-12 lg:pr-28 xl:p-16 xl:pr-32 [@media(min-width:1024px)_and_(max-height:800px)]:p-8 [@media(min-width:1024px)_and_(max-height:800px)]:pr-24">
            <div className="text-white">
              <div className="flex items-center justify-center gap-2 lg:justify-start">
                <span
                  aria-hidden
                  className="grid size-8 place-items-center rounded-lg bg-white text-[11px] font-semibold text-[#1655d6]"
                >
                  CC
                </span>
                <span className="text-lg font-semibold">CRM Center</span>
              </div>
              <p className="mt-8 hidden text-sm font-medium opacity-80 lg:block">
                CRM + OMS
              </p>
              <p className="mt-1 hidden text-[26px] leading-tight font-semibold lg:block">
                ระบบเดียว คุมได้ทั้งร้าน
              </p>
            </div>
            <div className="relative lg:flex lg:min-h-0 lg:flex-1 lg:items-center lg:justify-center">
              {/* Glow behind the mascots. */}
              <Image
                src="/login-glow.webp"
                alt=""
                aria-hidden
                width={1200}
                height={1200}
                sizes="(min-width: 1024px) 560px, 260px"
                className="pointer-events-none absolute top-1/2 left-1/2 w-[260px] max-w-none -translate-x-1/2 -translate-y-1/2 lg:w-[min(90%,560px)]"
              />
              <Image
                src="/login-mascots.webp"
                alt="มาสคอต CRM Center ยืนบนแล็ปท็อป ล้อมรอบด้วยไอคอนช่องทางขาย"
                width={1400}
                height={1134}
                priority
                sizes="(min-width: 1024px) 640px, 220px"
                className="relative mx-auto w-full max-w-[220px] animate-[portal-float_6s_ease-in-out_infinite] drop-shadow-[0_30px_40px_rgb(10_40_120/0.35)] lg:h-full lg:max-h-[518px] lg:w-auto lg:max-w-full lg:object-contain"
              />
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="relative flex flex-col justify-center rounded-t-[24px] bg-surface px-6 py-10 sm:px-10 lg:min-h-0 lg:[scrollbar-width:none] lg:overflow-y-auto lg:rounded-l-[32px] lg:rounded-tr-none lg:px-16 [@media(max-height:800px)]:py-6">
          <div className="text-center">
            <h1 className="text-[32px] leading-[1.2] font-semibold sm:text-[36px]">
              ยินดีต้อนรับ
            </h1>
            <p className="mt-2 text-sm text-content-quiet">
              กรอกข้อมูลของคุณเพื่อเข้าสู่ระบบ
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="mx-auto mt-10 flex w-full max-w-[360px] flex-col gap-6 [@media(max-height:800px)]:mt-6 [@media(max-height:800px)]:gap-4"
          >
            <UnderlineField label="อีเมล" htmlFor="login-email">
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                placeholder="name@company.co.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={underline}
              />
            </UnderlineField>

            <UnderlineField label="รหัสผ่าน" htmlFor="login-password">
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(underline, "pr-10")}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-0 inline-flex size-9 -translate-y-1/2 items-center justify-end text-content-secondary hover:text-content"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </UnderlineField>

            <div className="-mt-2 flex items-center justify-between gap-3 text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-content-secondary select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    "grid size-4 place-items-center rounded-xs border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-action",
                    remember
                      ? "border-content bg-content text-surface"
                      : "border-control"
                  )}
                >
                  {remember && <Check size={11} weight="bold" />}
                </span>
                จดจำฉันไว้
              </label>
              <button
                type="button"
                onClick={() =>
                  setNotice("ติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน")
                }
                className="text-content-quiet hover:text-content"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>

            {error && (
              <Alert type="error">
                อีเมลหรือรหัสผ่านไม่ถูกต้อง ลองตรวจสอบอีกครั้ง (ใส่ผิด 5
                ครั้งบัญชีจะถูกล็อก 15 นาที)
              </Alert>
            )}
            {notice && <Alert type="info">{notice}</Alert>}

            <button
              type="submit"
              className="mt-2 min-h-12 rounded-full bg-content text-sm font-medium text-surface transition-[opacity,transform] duration-[120ms] hover:opacity-90 active:scale-[0.98]"
            >
              เข้าสู่ระบบ
            </button>

            <div className="flex items-center gap-4 text-sm text-content-quiet">
              <span className="h-px flex-1 bg-line" />
              หรือเข้าสู่ระบบด้วย
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="flex justify-center gap-3">
              {SOCIALS.map(({ name, icon }) => (
                <button
                  key={name}
                  type="button"
                  aria-label={`เข้าสู่ระบบด้วย ${name}`}
                  onClick={onSocial}
                  className="grid size-11 place-items-center rounded-full border border-line bg-surface transition-[background-color,transform] duration-[120ms] hover:bg-hover active:scale-95"
                >
                  {icon}
                </button>
              ))}
            </div>
          </form>

          <p className="pt-10 text-center text-xs text-content-quiet [@media(max-height:800px)]:pt-6">
            ยังไม่มีบัญชี?{" "}
            <span className="font-medium text-content">ติดต่อผู้ดูแลระบบ</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// Work-account providers an admin portal would offer.
const SOCIALS = [
  { name: "Google", icon: <GoogleMark /> },
  { name: "Microsoft", icon: <MicrosoftMark /> },
]

function MicrosoftMark() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 23 23">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}

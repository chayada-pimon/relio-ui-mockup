import type { Metadata } from "next"
import { Bai_Jamjuree } from "next/font/google"
import Script from "next/script"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LangProvider } from "@/lib/relio/i18n"
import { cn } from "@/lib/utils"

const baiJamjuree = Bai_Jamjuree({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bai-jamjuree",
})

export const metadata: Metadata = {
  title: "RELIO — Customers + Orders, Connected.",
  description: "RELIO CRM + OMS prototype",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={cn("antialiased", baiJamjuree.variable)}
    >
      <body>
        <ThemeProvider>
          <LangProvider>{children}</LangProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </body>
    </html>
  )
}

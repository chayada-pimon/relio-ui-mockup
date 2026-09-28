import type { Metadata } from "next"
import { Noto_Sans_Thai } from "next/font/google"
import Script from "next/script"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { PortalProvider } from "@/lib/portal/store"
import { cn } from "@/lib/utils"

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-thai",
})

export const metadata: Metadata = {
  title: "CRM Center",
  description: "CRM Center Admin Portal (mockup)",
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
      className={cn("antialiased", notoSansThai.variable)}
    >
      <body>
        <ThemeProvider>
          <PortalProvider>{children}</PortalProvider>
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

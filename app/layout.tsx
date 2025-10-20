import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: 'KOCO 자동화 진단 사이트 (PSA, PSO)',
  description: 'KOCO 자동화 진단 시스템으로 PSA와 PSO 분석을 효율적으로 수행하세요',
  keywords: 'KOCO, PSA, PSO, 자동화 진단, 분석 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
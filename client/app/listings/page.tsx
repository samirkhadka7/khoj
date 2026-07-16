'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

import { ListingsPageContent } from '@/components/listings/ListingsPageContent'

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      }
    >
      <ListingsPageContent basePath="/listings" showNavbar />
    </Suspense>
  )
}

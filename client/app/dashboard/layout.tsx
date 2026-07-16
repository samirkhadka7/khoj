'use client'

import { ReactNode, useState, useEffect } from 'react'
import { DashboardProvider } from '@/components/dashboard/DashboardContext'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  return (
    <DashboardProvider>
      <div className="flex min-h-screen bg-offWhite relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="h-full">
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto w-full">
          {/* Mobile Header */}
          <header className="lg:hidden bg-dark text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
            <Link
              href="/dashboard"
              className="font-display font-extrabold text-[22px] text-white tracking-[-0.5px] no-underline"
            >
              Baas<span className="text-primary">Khoj</span>
            </Link>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 hover:bg-white/10 rounded-sm text-white/90 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={24} strokeWidth={2.5} />
            </button>
          </header>

          <main className="flex-1 w-full">{children}</main>
        </div>
      </div>
    </DashboardProvider>
  )
}


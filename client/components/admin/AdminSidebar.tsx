'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AlertTriangle,
  ClipboardCheck,
  IdCard,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
  X
} from 'lucide-react'
import { useAdmin } from './AdminContext'

interface NavItem {
  href: string
  label: string
  Icon: typeof LayoutDashboard
}

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/kyc', label: 'KYC Applications', Icon: IdCard },
  { href: '/admin/listings/pending', label: 'Pending Verifications', Icon: ClipboardCheck },
  { href: '/admin/reports', label: 'Reports', Icon: AlertTriangle },
  { href: '/admin/users', label: 'Users', Icon: Users },
]

interface AdminSidebarProps {
  onClose?: () => void
}

export function AdminSidebar({ onClose }: AdminSidebarProps = {}) {
  const pathname = usePathname()
  const { user, logout } = useAdmin()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href)

  return (
    <aside className="w-[280px] md:w-[260px] bg-dark text-white flex flex-col h-screen overflow-hidden">
      {/* Logo + admin badge */}
      <div className="px-6 pt-6 pb-5 border-b border-white/10 flex items-start justify-between">
        <div>
          <Link
            href="/admin"
            className="font-display font-extrabold text-[22px] text-white tracking-[-0.5px] no-underline"
          >
            Baas<span className="text-primary">Khoj</span>
          </Link>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.7px] text-accent-light">
            <Shield size={11} strokeWidth={2.5} />
            Admin Console
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="md:hidden p-1 hover:bg-white/10 rounded-sm text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* User pill */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/25 flex items-center justify-center text-accent-light font-display font-bold text-[14px] flex-shrink-0">
            {user.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-white truncate">{user.name}</div>
            <div className="text-[11.5px] text-accent-light/70">Administrator</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1 list-none">
          {adminNav.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-[14px] font-medium transition-colors no-underline ${
                    active
                      ? 'bg-primary text-white'
                      : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <item.Icon size={16} strokeWidth={2.2} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-6 pt-4 border-t border-white/10">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] font-medium text-white/50 hover:bg-white/[0.06] hover:text-white transition-colors no-underline"
          >
            <LayoutDashboard size={14} strokeWidth={2.2} />
            View as user
          </Link>
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[14px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
        >
          <LogOut size={16} strokeWidth={2.2} />
          Logout
        </button>
      </div>
    </aside>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Heart,
  Home,
  LayoutDashboard,
  ListPlus,
  LogOut,
  Mail,
  MessageSquare,
  Search,
  Shield,
  ShieldCheck,
  User as UserIcon,
  X
} from 'lucide-react'
import { useDashboardUser } from './DashboardContext'

interface NavItem {
  href: string
  label: string
  Icon: typeof Home
  badge?: number
}

const userNav: NavItem[] = [
  { href: '/dashboard/listings', label: 'Find Space', Icon: Search },
  { href: '/dashboard/contact-requests', label: 'My Requests', Icon: Mail },
  { href: '/dashboard/wishlist', label: 'Wishlist', Icon: Heart },
  { href: '/dashboard/messages', label: 'Messages', Icon: MessageSquare },
  { href: '/dashboard/profile', label: 'Profile', Icon: UserIcon },
]

const ownerNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/dashboard/my-listings', label: 'My Listings', Icon: Home },
  { href: '/dashboard/contact-requests', label: 'Received Requests', Icon: Mail },
  // Owners need the same chat access as tenants — chat is bidirectional once a
  // contact request is accepted. Without this, owners had no UI path to /dashboard/messages.
  { href: '/dashboard/messages', label: 'Messages', Icon: MessageSquare },
  { href: '/dashboard/my-listings/new', label: 'Add New Listing', Icon: ListPlus },
  { href: '/dashboard/profile', label: 'Profile', Icon: UserIcon },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps = {}) {
  const pathname = usePathname()
  const { user, logout } = useDashboardUser()

  const isOwner = user.role === 'owner' || user.role === 'admin'
  const items = isOwner ? ownerNav : userNav
  const isActive = (href: string) =>
    href === pathname || (href !== '/dashboard' && pathname?.startsWith(href))

  return (
    <aside className="w-[280px] lg:w-[260px] bg-dark text-white flex flex-col h-screen overflow-hidden">
      {/* Logo */}
      <div className="px-6 pt-6 pb-5 border-b border-white/10 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-display font-extrabold text-[22px] text-white tracking-[-0.5px] no-underline"
        >
          Baas<span className="text-primary">Khoj</span>
        </Link>
        {onClose && (
          <button 
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-white/10 rounded-sm text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* User pill */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display font-bold text-[14px] flex-shrink-0">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-white truncate">{user.name}</div>
            <div className="text-[11.5px] text-white/45 capitalize">{user.role}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 lg:overflow-y-auto">
        <ul className="space-y-1 list-none">
          {items.map((item) => {
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
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        active ? 'bg-white/20' : 'bg-primary text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Become Owner CTA — only for plain users (owners/admins already have listing nav) */}
        {!isOwner && (
          <Link
            href="/dashboard/become-owner"
            className="mt-5 mx-1 block bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-sm p-3 transition-colors no-underline"
          >
            <div className="flex items-center gap-2 text-[12px] font-bold text-primary uppercase tracking-[0.5px] mb-1">
              <ShieldCheck size={12} strokeWidth={2.5} />
              Owner access
            </div>
            <div className="text-[12.5px] text-white/80 leading-[1.4]">
              List your property — submit KYC verification.
            </div>
          </Link>
        )}

        {/* Admin Console shortcut — round-trip from /admin's "View as user" link.
            Without this, admins viewing the user dashboard have no way back to
            the admin panel except retyping the URL. */}
        {user.role === 'admin' && (
          <Link
            href="/admin"
            className="mt-5 mx-1 flex items-center gap-3 px-3 py-2.5 rounded-sm bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent-light hover:text-white text-[14px] font-medium transition-colors no-underline"
          >
            <Shield size={16} strokeWidth={2.2} />
            <span className="flex-1">Admin Console</span>
          </Link>
        )}
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

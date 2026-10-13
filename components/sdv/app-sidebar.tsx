'use client'

import Link from 'next/link'
import { Activity, ChevronsLeft, ChevronsRight, FileText, Search, Settings2, ShieldCheck, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CAPABILITY_LABELS, PERSONAS, type Persona } from '@/lib/sdv/mock-data'
import type { Capability } from '@/lib/sdv/types'

type Props = {
  collapsed: boolean
  mobileOpen: boolean
  onToggle: () => void
  onCloseMobile: () => void
  persona: Persona
  onPersonaChange: (persona: Persona) => void
  capabilities: Set<Capability>
  onToggleCapability: (capability: Capability) => void
}

const NAV = [
  { title: 'Work', items: [{ label: 'Search', icon: Search, active: true }] },
  { title: 'Administration', items: [{ label: 'Administration', icon: Settings2, active: false }] },
  { title: 'Operations', items: [{ label: 'Operations', icon: Activity, active: false }] },
  { title: 'Support', items: [{ label: 'Audit', icon: ShieldCheck, active: false }] },
]

export function AppSidebar({ collapsed, mobileOpen, onToggle, onCloseMobile, persona, onPersonaChange, capabilities, onToggleCapability }: Props) {
  const current = PERSONAS.find((item) => item.value === persona)!
  const initials = current.user.slice(0, 2).toUpperCase()
  // Laptop widths (lg–xl) always get the icon rail so content keeps its space; xl+ honours the user's toggle.
  const rail = collapsed
    ? { hide: 'lg:hidden', sr: 'lg:sr-only', center: 'lg:justify-center lg:px-0' }
    : { hide: 'lg:max-xl:hidden', sr: 'lg:max-xl:sr-only', center: 'lg:max-xl:justify-center lg:max-xl:px-0' }

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-[#101828]/40 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />}
      <aside
        aria-label="Primary"
        className={cn(
          'no-print z-50 flex shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-150',
          'fixed inset-y-0 left-0 w-64 -translate-x-full lg:static lg:translate-x-0',
          mobileOpen && 'translate-x-0',
          collapsed ? 'lg:w-14' : 'lg:w-14 xl:w-60',
        )}
      >
        <div className={cn('flex h-12 items-center gap-2.5 border-b border-sidebar-border px-3', rail.center)}>
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-[13px] font-bold text-white">S</span>
          <div className={cn('min-w-0 flex-1 leading-tight', rail.hide)}>
            <p className="truncate text-[13px] font-semibold text-white">Secure Document Vault</p>
            <p className="text-[11px] text-[#98a2b3]">Northbridge Financial</p>
          </div>
          <button type="button" onClick={onCloseMobile} className="rounded p-1 text-[#98a2b3] hover:bg-sidebar-accent hover:text-white lg:hidden" aria-label="Close navigation">
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Primary navigation">
          {NAV.map((section) => (
            <div key={section.title} className="mb-3">
              <p className={cn('px-2 pb-1 text-[10px] font-semibold tracking-wider text-[#667085] uppercase', rail.sr)}>{section.title}</p>
              {section.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  aria-current={item.active ? 'page' : undefined}
                  disabled={!item.active}
                  title={item.active ? item.label : `${item.label} — out of scope for this design exercise`}
                  className={cn(
                    'relative flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium',
                    item.active ? 'bg-sidebar-accent text-white before:absolute before:inset-y-2 before:-left-2 before:w-0.5 before:rounded-full before:bg-[#7c9cf5]' : 'text-sidebar-foreground/55',
                    rail.center,
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className={cn(rail.sr)}>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className={cn('border-t border-sidebar-border p-2', rail.hide)}>
          <details className="group rounded-md bg-sidebar-accent/60">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 text-[12px] font-medium text-white">
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              Prototype controls
              <span className="ml-auto text-[11px] text-[#98a2b3] group-open:hidden">{current.label}</span>
            </summary>
            <div className="space-y-2.5 px-2.5 pt-1 pb-3">
              <label className="block text-[11px] text-[#98a2b3]">
                Demo role
                <select
                  value={persona}
                  onChange={(event) => onPersonaChange(event.target.value as Persona)}
                  className="mt-1 h-8 w-full rounded border border-sidebar-border bg-sidebar px-2 text-[12px] text-white"
                >
                  {PERSONAS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <fieldset className="space-y-1">
                <legend className="mb-1 text-[11px] text-[#98a2b3]">Session capabilities</legend>
                {(Object.keys(CAPABILITY_LABELS) as Capability[]).map((capability) => (
                  <label key={capability} className="flex items-center gap-2 text-[11.5px] text-sidebar-foreground">
                    <input type="checkbox" className="size-3.5 accent-[#3157c8]" checked={capabilities.has(capability)} onChange={() => onToggleCapability(capability)} />
                    {CAPABILITY_LABELS[capability]}
                  </label>
                ))}
              </fieldset>
            </div>
          </details>
          <Link href="/design-notes" className="mt-2 flex items-center gap-2 rounded-md px-2.5 py-2 text-[12px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-white">
            <FileText className="size-3.5" aria-hidden="true" />
            Design notes & rationale
          </Link>
        </div>

        <div className={cn('flex items-center gap-2.5 border-t border-sidebar-border p-3', rail.center)}>
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#344054] text-[11px] font-semibold text-white" aria-hidden="true">{initials}</span>
          <div className={cn('min-w-0 flex-1 leading-tight', rail.hide)}>
            <p className="truncate text-[12px] font-medium text-white">{current.user}</p>
            <p className="text-[11px] text-[#98a2b3]">{current.label} · local</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="hidden h-10 items-center justify-center gap-2 border-t border-sidebar-border text-[12px] text-[#98a2b3] hover:bg-sidebar-accent hover:text-white xl:flex"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Collapse</>}
        </button>
      </aside>
    </>
  )
}

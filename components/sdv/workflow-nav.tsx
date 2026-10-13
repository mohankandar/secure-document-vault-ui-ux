'use client'

import { FileText, History, List, Menu, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BusinessRecord, WorkflowTab } from '@/lib/sdv/types'
import { RecordContext } from './record-context'

type Props = {
  tab: WorkflowTab
  onTab: (tab: WorkflowTab) => void
  resultCount: number | null
  canOpenViewer: boolean
  hasRecord: boolean
  /** Only passed where the record is not already shown in the page body (Viewer, Activity). */
  record: BusinessRecord | null
  onOpenMenu: () => void
}

export function WorkflowNav({ tab, onTab, resultCount, canOpenViewer, hasRecord, record, onOpenMenu }: Props) {
  const items: { id: WorkflowTab; label: string; short: string; icon: typeof Search; disabled: boolean; badge?: number | null }[] = [
    { id: 'search', label: 'Search', short: 'Search', icon: Search, disabled: false },
    { id: 'results', label: 'Results', short: 'Results', icon: List, disabled: resultCount === null, badge: resultCount },
    { id: 'viewer', label: 'Document Viewer', short: 'Viewer', icon: FileText, disabled: !canOpenViewer },
    { id: 'activity', label: 'Activity', short: 'Activity', icon: History, disabled: !hasRecord },
  ]

  return (
    <header className="no-print flex h-13 shrink-0 items-stretch gap-3 border-b border-border bg-card pr-3 pl-1 lg:pl-4">
      <button type="button" onClick={onOpenMenu} className="my-auto grid size-9 place-items-center rounded-md text-secondary-text hover:bg-muted lg:hidden" aria-label="Open navigation">
        <Menu className="size-4" />
      </button>
      <nav aria-label="Business document workflow" className="flex items-stretch">
        {items.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              aria-current={active ? 'step' : undefined}
              onClick={() => onTab(item.id)}
              className={cn(
                'relative flex min-w-11 items-center justify-center gap-2 px-2.5 text-[13px] font-medium text-secondary-text transition-colors hover:text-strong disabled:cursor-not-allowed disabled:text-[#a3abb8] md:px-3.5',
                active && 'font-semibold text-strong after:absolute after:inset-x-2 after:bottom-0 after:h-[2.5px] after:rounded-t-full after:bg-primary',
              )}
            >
              <item.icon className={cn('size-4', active ? 'text-primary' : '')} aria-hidden="true" />
              <span className="hidden md:inline xl:hidden">{item.short}</span>
              <span className="hidden xl:inline">{item.label}</span>
              {item.badge != null && (
                <span className="rounded-full bg-muted px-1.5 text-[11px] leading-[18px] font-semibold text-secondary-text tabular-nums ring-1 ring-border">{item.badge}</span>
              )}
            </button>
          )
        })}
      </nav>
      {record && (
        <div className="ml-auto flex min-w-0 items-center">
          <RecordContext record={record} />
        </div>
      )}
    </header>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, FileText, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROTOTYPE_NOW } from '@/lib/sdv/mock-data'
import { ACTIVITY_ACTION_OPTIONS, actionLabel, formatDateTime, VIEW_EVENT_ACTIONS } from '@/lib/sdv/format'
import type { BusinessRecord, DocumentActivity } from '@/lib/sdv/types'
import { Button, Input, Select } from './primitives'

type Props = {
  record: BusinessRecord
  activity: DocumentActivity[]
  initialDocumentId: string
  onBack: () => void
  onOpenDocument: (documentId: string) => void
}

type Filters = { documentId: string; action: string; actor: string; range: string; includeViews: boolean }

const ACTION_TONE: Record<string, string> = {
  DOCUMENT_PERMANENTLY_REDACTED: 'bg-danger-bg text-destructive ring-[#f3c4bf]',
  DOCUMENT_REDACTION_FAILED: 'bg-danger-bg text-destructive ring-[#f3c4bf]',
  DOCUMENT_DOWNLOADED: 'bg-selected text-accent-foreground ring-[#c7d3f3]',
  DOCUMENT_PRINTED: 'bg-selected text-accent-foreground ring-[#c7d3f3]',
}

export function ActivityView({ record, activity, initialDocumentId, onBack, onOpenDocument }: Props) {
  const defaults: Filters = { documentId: initialDocumentId, action: '', actor: '', range: '90', includeViews: false }
  const [filters, setFilters] = useState<Filters>(defaults)
  const set = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }))

  const filenames = useMemo(() => new Map(record.documents.map((document) => [document.documentId, document.originalFilename])), [record])

  const rows = activity
    .filter((event) => !filters.documentId || event.documentId === filters.documentId)
    .filter((event) => !filters.action || event.action === filters.action)
    .filter((event) => !filters.actor.trim() || event.actorId.toLowerCase().includes(filters.actor.trim().toLowerCase()))
    .filter((event) => filters.includeViews || !VIEW_EVENT_ACTIONS.has(event.action))
    .filter((event) => filters.range === 'all' || new Date(event.occurredAt).getTime() >= new Date(PROTOTYPE_NOW).getTime() - Number(filters.range) * 86_400_000)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

  const dirty = JSON.stringify(filters) !== JSON.stringify(defaults)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold text-strong">Activity</h1>
          <p className="text-[13px] text-secondary-text">Who did what, and when, on documents in this record. Newest first.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack}><ArrowLeft aria-hidden="true" />Back to document</Button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-xs">
        <div className="grid grid-cols-1 gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]" role="group" aria-label="Activity filters">
          <label className="min-w-0">
            <span className="mb-1 block text-[12.5px] font-medium text-strong">Document</span>
            <Select value={filters.documentId} onChange={(e) => set({ documentId: e.target.value })} className="h-8 text-[13px]">
              <option value="">All documents in record ({record.documents.length})</option>
              {record.documents.map((document) => (
                <option key={document.documentId} value={document.documentId}>{document.originalFilename}</option>
              ))}
            </Select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-[12.5px] font-medium text-strong">Action Type</span>
            <Select value={filters.action} onChange={(e) => set({ action: e.target.value })} className="h-8 text-[13px]">
              <option value="">All actions</option>
              {ACTIVITY_ACTION_OPTIONS.map((action) => (
                <option key={action} value={action}>{actionLabel(action)}</option>
              ))}
              {filters.includeViews && <option value="DOCUMENT_VIEW_OPENED">{actionLabel('DOCUMENT_VIEW_OPENED')}</option>}
            </Select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-[12.5px] font-medium text-strong">Performed By</span>
            <Input value={filters.actor} onChange={(e) => set({ actor: e.target.value })} placeholder="All users" className="h-8 text-[13px]" />
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-[12.5px] font-medium text-strong">Date Range</span>
            <Select value={filters.range} onChange={(e) => set({ range: e.target.value })} className="h-8 text-[13px]">
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
              <option value="all">All time</option>
            </Select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
          <p className="text-[12.5px] text-secondary-text tabular-nums" aria-live="polite">
            {rows.length} {rows.length === 1 ? 'event' : 'events'}
          </p>
          <label className="flex items-center gap-2 text-[12.5px] text-secondary-text">
            <input
              type="checkbox"
              className="size-3.5 accent-[#3157c8]"
              checked={filters.includeViews}
              onChange={(e) => set({ includeViews: e.target.checked, action: !e.target.checked && filters.action === 'DOCUMENT_VIEW_OPENED' ? '' : filters.action })}
            />
            Include document view events <span className="text-muted-foreground">· hidden by default</span>
          </label>
          {dirty && (
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setFilters(defaults)}>
              <RotateCcw aria-hidden="true" />Reset filters
            </Button>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-[13px] text-muted-foreground">No activity matches these filters.</p>
        ) : (
          <>
          <ol className="divide-y divide-border-soft md:hidden" aria-label="Document activity">
            {rows.map((event) => (
              <li key={event.auditEventId} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-md px-1.5 py-0.5 text-[12px] font-medium ring-1', ACTION_TONE[event.action] ?? 'bg-muted text-secondary-text ring-border')}>{actionLabel(event.action)}</span>
                  <span className={cn('ml-auto text-[12px]', event.outcome === 'SUCCESS' ? 'text-success' : 'text-destructive')}>{event.outcome === 'SUCCESS' ? 'Success' : 'Failed'}</span>
                </div>
                <button type="button" onClick={() => onOpenDocument(event.documentId)} className="mt-1.5 block max-w-full truncate text-left text-[13px] font-medium text-strong hover:text-primary hover:underline">
                  {filenames.get(event.documentId)}
                </button>
                <p className="mt-0.5 text-[12px] text-secondary-text tabular-nums">{event.actorId} · {formatDateTime(event.occurredAt)}</p>
              </li>
            ))}
          </ol>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-[13px]">
              <caption className="sr-only">Document activity</caption>
              <thead>
                <tr className="border-b border-border bg-muted text-left text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="px-4 py-2 whitespace-nowrap">Date &amp; time (UTC)</th>
                  <th scope="col" className="px-3 py-2">Event</th>
                  <th scope="col" className="px-3 py-2">Document</th>
                  <th scope="col" className="px-3 py-2">User</th>
                  <th scope="col" className="px-3 py-2 pr-4">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((event) => (
                  <tr key={event.auditEventId} className="border-b border-border-soft last:border-b-0 hover:bg-[#f8fafc]">
                    <td className="px-4 py-2.5 whitespace-nowrap text-secondary-text tabular-nums">{formatDateTime(event.occurredAt)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[12px] font-medium ring-1', ACTION_TONE[event.action] ?? 'bg-muted text-secondary-text ring-border')}>
                        {actionLabel(event.action)}
                      </span>
                    </td>
                    <td className="max-w-56 px-3 py-2.5">
                      <button type="button" onClick={() => onOpenDocument(event.documentId)} className="flex max-w-full items-center gap-1.5 text-left text-strong hover:text-primary hover:underline">
                        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{filenames.get(event.documentId)}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="text-strong">{event.actorId}</span>
                      {event.actorType !== 'USER' && <span className="ml-1.5 text-[11.5px] text-muted-foreground">system</span>}
                    </td>
                    <td className="px-3 py-2.5 pr-4 whitespace-nowrap">
                      <span className={cn('inline-flex items-center gap-1.5 text-[12.5px]', event.outcome === 'SUCCESS' ? 'text-success' : 'text-destructive')}>
                        <span className={cn('size-1.5 rounded-full', event.outcome === 'SUCCESS' ? 'bg-success' : 'bg-destructive')} aria-hidden="true" />
                        {event.outcome === 'SUCCESS' ? 'Success' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  )
}

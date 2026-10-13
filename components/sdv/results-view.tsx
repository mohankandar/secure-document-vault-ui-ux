'use client'

import { AlertTriangle, ArrowRight, FileText, History, Pencil, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '@/lib/sdv/format'
import type { BusinessRecord, RecordSummary, SearchSource } from '@/lib/sdv/types'
import { Button, SectionLabel, Select } from './primitives'

type Props = {
  source: SearchSource | undefined
  results: RecordSummary[]
  truncated: boolean
  criteriaSummary: { label: string; value: string }[]
  selectedRecord: BusinessRecord | null
  selectedDocumentId: string
  canView: boolean
  onSelectRecord: (recordRef: string) => void
  onSelectDocument: (documentId: string) => void
  onOpen: (documentId?: string) => void
  onModifySearch: () => void
  onViewActivity: () => void
}

export function ResultsView(props: Props) {
  const { source, results, truncated, criteriaSummary, selectedRecord, selectedDocumentId, canView, onSelectRecord, onModifySearch } = props
  const columns = (source?.fields ?? []).slice(0, 5)

  return (
    <div className="px-4 pt-4 pb-28 md:px-6 lg:pb-6">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[15px] font-semibold text-strong">
          Matching records <span className="ml-1 font-normal text-muted-foreground tabular-nums">{results.length}</span>
        </h1>
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Applied search criteria">
          <li className="rounded-md border border-border bg-card px-2 py-0.5 text-[12px] text-secondary-text">
            Source <span className="font-medium text-strong">{source?.displayName}</span>
          </li>
          {criteriaSummary.map((item) => (
            <li key={item.label} className="rounded-md border border-border bg-card px-2 py-0.5 text-[12px] text-secondary-text">
              {item.label} <span className="font-medium text-strong tabular-nums">{item.value}</span>
            </li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" onClick={onModifySearch} className="ml-auto">
          <Pencil aria-hidden="true" />Modify search
        </Button>
      </div>

      {truncated && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-[#fedf89] bg-warning-bg px-3 py-2 text-[13px] text-warning">
          <AlertTriangle className="size-4" aria-hidden="true" />Result window reached. Refine the search to narrow the list.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Matching records" className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-6 py-14 text-center">
              <SearchX className="mb-2 size-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-strong">No matching records</p>
              <p className="text-[13px] text-muted-foreground">Change your criteria and try again.</p>
              <Button size="sm" className="mt-3" onClick={onModifySearch}>Modify search</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <caption className="sr-only">Select a business record to see its documents</caption>
                <thead>
                  <tr className="border-b border-border bg-muted text-left text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="w-10 py-2 pl-4"><span className="sr-only">Select</span></th>
                    {columns.map((field) => (
                      <th key={field.fieldKey} scope="col" className="px-3 py-2 whitespace-nowrap">{field.displayLabel}</th>
                    ))}
                    <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">Documents</th>
                    <th scope="col" className="px-3 py-2 pr-4 whitespace-nowrap">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item) => {
                    const values = new Map([...item.identifiers, ...item.metadataPreview].map((value) => [value.fieldKey, value.value]))
                    const selected = selectedRecord?.recordRef === item.recordRef
                    const label = item.identifiers[0]?.value ?? item.recordRef
                    return (
                      <tr
                        key={item.recordRef}
                        onClick={() => onSelectRecord(item.recordRef)}
                        className={cn(
                          'cursor-pointer border-b border-border-soft last:border-b-0 hover:bg-[#f8fafc]',
                          selected && 'bg-selected shadow-[inset_3px_0_0_var(--primary)] hover:bg-selected',
                        )}
                      >
                        <td className="py-2.5 pl-4">
                          <input
                            type="radio"
                            name="selected-record"
                            className="size-4 accent-[#3157c8]"
                            aria-label={`Select record ${label}`}
                            checked={selected}
                            onChange={() => onSelectRecord(item.recordRef)}
                          />
                        </td>
                        {columns.map((field, index) => (
                          <td key={field.fieldKey} className={cn('px-3 py-2.5 whitespace-nowrap tabular-nums', index === 0 ? 'font-semibold text-strong' : 'text-foreground')}>
                            {values.get(field.fieldKey) ?? '—'}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-right tabular-nums">{item.availableDocumentCount}</td>
                        <td className="px-3 py-2.5 pr-4 whitespace-nowrap text-secondary-text tabular-nums">{formatDate(item.latestSubmissionAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <SelectedRecordPanel {...props} />
      </div>

      {selectedRecord && <MobileSelectionBar {...props} record={selectedRecord} />}

      {!selectedRecord && results.length > 0 && (
        <p className="mt-3 text-[12.5px] text-muted-foreground lg:hidden">Select a record to see its documents.</p>
      )}
      {!canView && selectedDocumentId && <p className="mt-3 text-[12.5px] text-muted-foreground">Your role does not include View documents.</p>}
    </div>
  )
}

function SelectedRecordPanel({ selectedRecord, selectedDocumentId, canView, onSelectDocument, onOpen, onViewActivity }: Props) {
  return (
    <aside aria-label="Selected record" className="hidden rounded-lg border border-border bg-card shadow-xs lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-7rem)] lg:flex-col">
      <div className="border-b border-border px-4 py-3">
        <SectionLabel>Selected record</SectionLabel>
        {!selectedRecord && <p className="mt-1 text-[13px] text-muted-foreground">Select a record in the table to see its details and documents.</p>}
      </div>
      {selectedRecord && (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-b border-border px-4 py-3">
            {selectedRecord.metadata.map((value) => (
              <div key={value.fieldKey} className="min-w-0">
                <dt className="text-[11.5px] text-muted-foreground">{value.displayLabel}</dt>
                <dd className="truncate text-[13px] font-semibold text-strong tabular-nums">{value.value}</dd>
              </div>
            ))}
            <div className="min-w-0">
              <dt className="text-[11.5px] text-muted-foreground">Source</dt>
              <dd className="truncate text-[13px] font-semibold text-strong">{selectedRecord.sourceDisplayName}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11.5px] text-muted-foreground">Last Updated</dt>
              <dd className="truncate text-[13px] text-strong tabular-nums">{formatDate(selectedRecord.latestSubmissionAt)}</dd>
            </div>
          </dl>
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="px-4 pt-3 pb-1.5 text-[12.5px] font-semibold text-strong">
              Available documents <span className="font-normal text-muted-foreground tabular-nums">({selectedRecord.documents.length})</span>
            </p>
            <div role="radiogroup" aria-label="Available documents" className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {selectedRecord.documents.map((document) => {
                const selected = selectedDocumentId === document.documentId
                return (
                  <button
                    key={document.documentId}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onSelectDocument(document.documentId)}
                    onDoubleClick={() => canView && onOpen(document.documentId)}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-md border px-2.5 py-2 text-left',
                      selected ? 'border-[#b8c6ef] bg-selected' : 'border-transparent hover:bg-muted',
                    )}
                  >
                    <FileText className={cn('mt-0.5 size-4 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-strong">{document.originalFilename}</span>
                      <span className="block text-[11.5px] text-muted-foreground tabular-nums">Available {formatDateTime(document.availableAt)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-2 border-t border-border p-3">
            <Button variant="primary" className="w-full" disabled={!selectedDocumentId || !canView} onClick={() => onOpen()}>
              Open selected document<ArrowRight aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={onViewActivity}>
              <History aria-hidden="true" />View record activity
            </Button>
          </div>
        </>
      )}
    </aside>
  )
}

function MobileSelectionBar({ record, selectedDocumentId, canView, onSelectDocument, onOpen }: Props & { record: BusinessRecord }) {
  const primary = record.identifiers[0]
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 py-3 shadow-[0_-4px_16px_rgba(16,24,40,0.08)] lg:hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 sm:w-56">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Selected record</p>
          <p className="truncate text-[13px] font-semibold text-strong tabular-nums">
            {primary?.displayLabel} {primary?.value}
          </p>
          <p className="truncate text-[12px] text-secondary-text tabular-nums">
            {record.identifiers.slice(1).map((value) => `${value.displayLabel} ${value.value}`).join(' · ')} · {record.sourceDisplayName}
          </p>
        </div>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Document</span>
          <Select value={selectedDocumentId} onChange={(e) => onSelectDocument(e.target.value)}>
            {record.documents.map((document) => (
              <option key={document.documentId} value={document.documentId}>{document.originalFilename}</option>
            ))}
          </Select>
        </label>
        <Button variant="primary" disabled={!selectedDocumentId || !canView} onClick={() => onOpen()}>Open selected document</Button>
      </div>
    </div>
  )
}

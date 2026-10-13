'use client'

import { AlertTriangle, ArrowRight, Check, FileText, History, MousePointerClick, Pencil, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '@/lib/sdv/format'
import type { BusinessRecord, RecordSummary, SearchSource } from '@/lib/sdv/types'
import { Button, Chip, SectionLabel, Select } from './primitives'

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
  const { source, results, truncated, criteriaSummary, selectedRecord, onModifySearch } = props

  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-strong">
              <span className="tabular-nums">{results.length}</span> matching {results.length === 1 ? 'record' : 'records'}
            </h1>
            <p className="text-[12.5px] text-muted-foreground">in {source?.displayName}</p>
          </div>
          <ul className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label="Applied search criteria">
            {criteriaSummary.map((item) => (
              <li key={item.label}><Chip label={item.label} value={item.value} /></li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" onClick={onModifySearch} className="ml-auto">
            <Pencil aria-hidden="true" />Modify search
          </Button>
        </div>
      </div>

      <div className="px-4 pt-5 pb-32 md:px-8 lg:pb-8">
        {truncated && (
          <div role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-warning-bg px-3.5 py-2.5 text-[13px] text-warning ring-1 ring-[#fedf89] ring-inset">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />Result window reached. Refine the search to narrow the list.
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem]">
          <ResultsTable {...props} />
          <SelectedRecordPanel {...props} />
        </div>

        {!selectedRecord && results.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-muted-foreground lg:hidden">
            <MousePointerClick className="size-3.5" aria-hidden="true" />Select a record to see its documents.
          </p>
        )}
      </div>

      {selectedRecord && <MobileSelectionBar {...props} record={selectedRecord} />}
    </>
  )
}

function ResultsTable({ source, results, selectedRecord, onSelectRecord, onModifySearch }: Props) {
  const columns = (source?.fields ?? []).slice(0, 5)

  if (results.length === 0) {
    return (
      <section aria-label="Matching records" className="panel flex flex-col items-center px-6 py-16 text-center">
        <span className="mb-3 grid size-11 place-items-center rounded-full bg-muted ring-1 ring-border">
          <SearchX className="size-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-strong">No matching records</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Try fewer fields or a wider date range.</p>
        <Button variant="primary" size="sm" className="mt-4" onClick={onModifySearch}>Modify search</Button>
      </section>
    )
  }

  return (
    <section aria-label="Matching records" className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <caption className="sr-only">Select a business record to see its documents</caption>
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              <th scope="col" className="w-11 py-3 pl-4"><span className="sr-only">Select</span></th>
              {columns.map((field) => (
                <th key={field.fieldKey} scope="col" className="px-3 py-3 whitespace-nowrap">{field.displayLabel}</th>
              ))}
              <th scope="col" className="px-3 py-3 whitespace-nowrap">Documents</th>
              <th scope="col" className="px-3 py-3 pr-5 text-right whitespace-nowrap">Last Updated</th>
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
                  aria-selected={selected}
                  className={cn(
                    'group cursor-pointer border-b border-border-soft transition-colors last:border-b-0',
                    selected ? 'bg-selected shadow-[inset_3px_0_0_var(--primary)]' : 'hover:bg-muted',
                  )}
                >
                  <td className="py-3 pl-4">
                    <input
                      type="radio"
                      name="selected-record"
                      className="size-4 cursor-pointer accent-[#2a55d4]"
                      aria-label={`Select record ${label}`}
                      checked={selected}
                      onChange={() => onSelectRecord(item.recordRef)}
                    />
                  </td>
                  {columns.map((field, index) => (
                    <td key={field.fieldKey} className={cn('px-3 py-3 whitespace-nowrap tabular-nums', index === 0 ? 'font-semibold text-strong' : 'text-foreground')}>
                      {values.get(field.fieldKey) ?? <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <DocumentCount count={item.availableDocumentCount} />
                  </td>
                  <td className="px-3 py-3 pr-5 text-right whitespace-nowrap text-secondary-text tabular-nums">{formatDate(item.latestSubmissionAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DocumentCount({ count }: { count: number }) {
  if (count === 0) return <span className="text-[12.5px] text-muted-foreground">None</span>
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-card px-2 text-[12px] font-medium text-strong tabular-nums ring-1 ring-border ring-inset">
      <FileText className="size-3.5 text-primary" aria-hidden="true" />
      {count}
      <span className="sr-only">{count === 1 ? 'document' : 'documents'}</span>
    </span>
  )
}

function RecordIdentity({ record }: { record: BusinessRecord }) {
  const [primary, ...rest] = record.identifiers
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-medium text-muted-foreground">{primary?.displayLabel}</p>
      <p className="truncate text-xl font-semibold tracking-tight text-strong tabular-nums">{primary?.value}</p>
      {rest.length > 0 && (
        <p className="mt-0.5 truncate text-[12.5px] text-secondary-text tabular-nums">
          {rest.map((value) => `${value.displayLabel} ${value.value}`).join('  ·  ')}
        </p>
      )}
    </div>
  )
}

function SelectedRecordPanel({ selectedRecord, selectedDocumentId, canView, onSelectDocument, onOpen, onViewActivity }: Props) {
  if (!selectedRecord) {
    return (
      <aside aria-label="Selected record" className="panel hidden flex-col items-center px-6 py-12 text-center lg:sticky lg:top-5 lg:flex">
        <span className="mb-3 grid size-10 place-items-center rounded-full bg-selected">
          <MousePointerClick className="size-4.5 text-primary" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-strong">No record selected</p>
        <p className="mt-0.5 text-[13px] text-pretty text-muted-foreground">Choose a row to review its details and documents here.</p>
      </aside>
    )
  }

  const identifierKeys = new Set(selectedRecord.identifiers.map((value) => value.fieldKey))
  const details = selectedRecord.metadata.filter((value) => !identifierKeys.has(value.fieldKey))

  return (
    <aside aria-label="Selected record" className="panel hidden lg:sticky lg:top-5 lg:flex lg:max-h-[calc(100dvh-11rem)] lg:flex-col">
      <div className="border-b border-border-soft px-5 pt-4 pb-4">
        <SectionLabel className="mb-2 block">Selected record</SectionLabel>
        <RecordIdentity record={selectedRecord} />
      </div>

      {details.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border-soft px-5 py-4">
          {details.map((value) => (
            <div key={value.fieldKey} className="min-w-0">
              <dt className="text-[11.5px] text-muted-foreground">{value.displayLabel}</dt>
              <dd className="truncate text-[13px] font-medium text-strong tabular-nums">{value.value}</dd>
            </div>
          ))}
          <div className="min-w-0">
            <dt className="text-[11.5px] text-muted-foreground">Last Updated</dt>
            <dd className="truncate text-[13px] font-medium text-strong tabular-nums">{formatDate(selectedRecord.latestSubmissionAt)}</dd>
          </div>
        </dl>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <p className="flex items-baseline justify-between px-5 pt-4 pb-2">
          <span className="text-[13px] font-semibold text-strong">Documents</span>
          <span className="text-[12px] text-muted-foreground tabular-nums">{selectedRecord.documents.length} available</span>
        </p>
        <div role="radiogroup" aria-label="Available documents" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
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
                  'flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors',
                  selected ? 'bg-selected ring-1 ring-selected-border ring-inset' : 'hover:bg-muted',
                )}
              >
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-md', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground ring-1 ring-border')}>
                  <FileText className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-strong">{document.originalFilename}</span>
                  <span className="block text-[11.5px] text-muted-foreground tabular-nums">{formatDateTime(document.availableAt)}</span>
                </span>
                {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border-soft p-4">
        <Button variant="primary" size="lg" className="w-full" disabled={!selectedDocumentId || !canView} onClick={() => onOpen()}>
          Open document<ArrowRight aria-hidden="true" />
        </Button>
        {!canView && <p className="text-center text-[12px] text-muted-foreground">Your role does not include View documents.</p>}
        <Button variant="ghost" size="sm" className="w-full" onClick={onViewActivity}>
          <History aria-hidden="true" />Record activity
        </Button>
      </div>
    </aside>
  )
}

function MobileSelectionBar({ record, selectedDocumentId, canView, onSelectDocument, onOpen }: Props & { record: BusinessRecord }) {
  const primary = record.identifiers[0]
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-8px_24px_rgb(13_21_38/0.08)] backdrop-blur lg:hidden">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 sm:w-52">
          <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{primary?.displayLabel}</p>
          <p className="truncate text-[15px] font-semibold text-strong tabular-nums">{primary?.value}</p>
        </div>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Document</span>
          <Select value={selectedDocumentId} onChange={(e) => onSelectDocument(e.target.value)}>
            {record.documents.map((document) => (
              <option key={document.documentId} value={document.documentId}>{document.originalFilename}</option>
            ))}
          </Select>
        </label>
        <Button variant="primary" disabled={!selectedDocumentId || !canView} onClick={() => onOpen()}>
          Open document<ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

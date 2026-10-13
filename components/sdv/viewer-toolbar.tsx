'use client'

import { useEffect, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, Eraser, PanelRight, Printer, Search, X, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecordDocument } from '@/lib/sdv/types'
import { Button, Divider, Select } from './primitives'

export type ZoomMode = 'fit' | number
export const ZOOM_STEPS = [50, 75, 100, 125, 150, 200]

type SearchProps = {
  query: string
  matchIndex: number
  matchCount: number
  onQuery: (value: string) => void
  onNext: () => void
  onPrev: () => void
  onSubmit: () => void
  inputRef?: RefObject<HTMLInputElement | null>
  onClose?: () => void
  autoFocus?: boolean
  className?: string
}

const isComposing = (event: KeyboardEvent) => event.nativeEvent.isComposing || event.keyCode === 229

export function DocumentSearch({ query, matchIndex, matchCount, onQuery, onNext, onPrev, onSubmit, inputRef, onClose, autoFocus, className }: SearchProps) {
  const hasQuery = query.trim().length >= 2
  return (
    <div role="search" className={cn('flex h-8 items-center rounded-md border border-input bg-card shadow-xs focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20', className)}>
      <Search className="ml-2 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <label className="sr-only" htmlFor={onClose ? 'doc-search-floating' : 'doc-search'}>Search in document</label>
      <input
        id={onClose ? 'doc-search-floating' : 'doc-search'}
        ref={inputRef}
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !isComposing(event)) {
            event.preventDefault()
            onSubmit()
            if (event.shiftKey) onPrev()
            else onNext()
          }
          if (event.key === 'Escape' && onClose) onClose()
        }}
        placeholder="Search in document"
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-[13px] text-strong placeholder:text-[#98a2b3] focus:outline-none"
      />
      <span className="shrink-0 px-1 text-[11.5px] text-muted-foreground tabular-nums" aria-live="polite">
        {hasQuery ? (matchCount ? `${matchIndex + 1} of ${matchCount}` : 'No matches') : ''}
      </span>
      <button type="button" onClick={onPrev} disabled={!matchCount} className="grid size-7 place-items-center text-secondary-text hover:text-strong disabled:opacity-40" aria-label="Previous match">
        <ChevronUp className="size-4" />
      </button>
      <button type="button" onClick={onNext} disabled={!matchCount} className="grid size-7 place-items-center text-secondary-text hover:text-strong disabled:opacity-40" aria-label="Next match">
        <ChevronDown className="size-4" />
      </button>
      {onClose && (
        <button type="button" onClick={onClose} className="mr-0.5 grid size-7 place-items-center text-secondary-text hover:text-strong" aria-label="Close search">
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

type Props = {
  documents: RecordDocument[]
  documentId: string
  onSelectDocument: (documentId: string) => void
  onBack: () => void
  page: number
  pageCount: number
  onGoTo: (page: number) => void
  zoom: ZoomMode
  scale: number
  onZoom: (zoom: ZoomMode) => void
  search: SearchProps
  onOpenFloatingSearch: () => void
  canDownload: boolean
  canPrint: boolean
  canRedact: boolean
  onDownload: () => void
  onPrint: () => void
  onRedact: () => void
  inspectorOpen: boolean
  inspectorCount: number
  onToggleInspector: () => void
}

function Group({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn('flex h-9 shrink-0 items-center gap-0.5 rounded-lg bg-muted px-0.5 ring-1 ring-border-soft ring-inset', className)}>
      {children}
    </div>
  )
}

function PageInput({ page, pageCount, onGoTo }: { page: number; pageCount: number; onGoTo: (page: number) => void }) {
  const [value, setValue] = useState(String(page))
  useEffect(() => setValue(String(page)), [page])
  const commit = () => {
    const next = Number(value)
    if (Number.isInteger(next) && next >= 1 && next <= pageCount) onGoTo(next)
    else setValue(String(page))
  }
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-secondary-text">
      <label htmlFor="page-input" className="sr-only">Page number</label>
      <input
        id="page-input"
        value={value}
        inputMode="numeric"
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="h-7 w-10 rounded-md border border-input bg-card text-center text-[13px] text-strong tabular-nums shadow-xs focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 focus-visible:outline-none"
      />
      <span className="whitespace-nowrap tabular-nums">of {pageCount}</span>
    </div>
  )
}

export function ViewerToolbar(props: Props) {
  const { documents, documentId, onSelectDocument, onBack, page, pageCount, onGoTo, zoom, scale, onZoom, search, onOpenFloatingSearch } = props
  const percent = Math.round(scale * 100)
  const stepZoom = (direction: 1 | -1) => {
    const next = direction === 1 ? ZOOM_STEPS.find((step) => step > percent) : [...ZOOM_STEPS].reverse().find((step) => step < percent)
    if (next) onZoom(next)
  }

  return (
    <div role="toolbar" aria-label="Document tools" className="no-print flex h-13 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border bg-card px-3">
      <Button variant="toolbar" size="sm" onClick={onBack} aria-label="Back to Results" title="Back to Results" className="shrink-0 px-2">
        <ArrowLeft /><span className="hidden xl:inline">Results</span>
      </Button>
      <label className="sr-only" htmlFor="document-switcher">Document</label>
      <Select id="document-switcher" value={documentId} onChange={(e) => onSelectDocument(e.target.value)} className="h-9 w-40 shrink-0 text-[13px] font-semibold xl:w-52">
        {documents.map((document) => (
          <option key={document.documentId} value={document.documentId}>{document.originalFilename}</option>
        ))}
      </Select>
      <Group label="Pages">
        <Button variant="toolbar" size="icon-sm" onClick={() => onGoTo(page - 1)} disabled={page <= 1} aria-label="Previous page" title="Previous page" className="hover:bg-card">
          <ChevronLeft />
        </Button>
        <PageInput page={page} pageCount={pageCount} onGoTo={onGoTo} />
        <Button variant="toolbar" size="icon-sm" onClick={() => onGoTo(page + 1)} disabled={page >= pageCount} aria-label="Next page" title="Next page" className="hover:bg-card">
          <ChevronRight />
        </Button>
      </Group>
      <Group label="Zoom" className="hidden sm:flex">
        <Button variant="toolbar" size="icon-sm" onClick={() => stepZoom(-1)} disabled={percent <= ZOOM_STEPS[0]} aria-label="Zoom out" title="Zoom out" className="hover:bg-card">
          <ZoomOut />
        </Button>
        <label className="sr-only" htmlFor="zoom-select">Zoom</label>
        <Select
          id="zoom-select"
          value={String(zoom)}
          onChange={(e) => onZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value))}
          className="h-7 w-[7.75rem] shrink-0 border-transparent bg-transparent text-[13px] font-medium tabular-nums shadow-none hover:border-input"
        >
          <option value="fit">{zoom === 'fit' ? `Fit · ${percent}%` : 'Fit width'}</option>
          {ZOOM_STEPS.map((step) => (
            <option key={step} value={step}>{step}%</option>
          ))}
        </Select>
        <Button variant="toolbar" size="icon-sm" onClick={() => stepZoom(1)} disabled={percent >= ZOOM_STEPS.at(-1)!} aria-label="Zoom in" title="Zoom in" className="hover:bg-card">
          <ZoomIn />
        </Button>
      </Group>

      <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
        <DocumentSearch {...search} className="hidden h-9 w-60 xl:flex 2xl:w-72" />
        <Button variant="toolbar" size="icon-sm" onClick={onOpenFloatingSearch} aria-label="Search in document" title="Search in document (Ctrl+F)" className="xl:hidden">
          <Search />
        </Button>
        {(props.canDownload || props.canPrint) && <Divider />}
        {props.canDownload && (
          <Button variant="toolbar" size="sm" onClick={props.onDownload} aria-label="Download PDF" title="Download PDF" className="px-2">
            <Download /><span className="hidden 2xl:inline">Download</span>
          </Button>
        )}
        {props.canPrint && (
          <Button variant="toolbar" size="sm" onClick={props.onPrint} aria-label="Print" title="Print" className="px-2">
            <Printer /><span className="hidden 2xl:inline">Print</span>
          </Button>
        )}
        {props.canRedact && (
          <>
            <Divider />
            <Button variant="danger-outline" size="sm" onClick={props.onRedact} title="Permanent corrective redaction">
              <Eraser /><span className="hidden md:inline">Redact</span>
            </Button>
          </>
        )}
        <Divider />
        <Button variant="toolbar" size="sm" aria-pressed={props.inspectorOpen} onClick={props.onToggleInspector} aria-label="Toggle comments, tags and details panel" title="Comments, tags & details" className="px-2">
          <PanelRight />
          <span className="hidden md:inline">Details</span>
          {props.inspectorCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10.5px] leading-[17px] font-semibold text-primary-foreground tabular-nums">{props.inspectorCount}</span>
          )}
        </Button>
      </div>
    </div>
  )
}

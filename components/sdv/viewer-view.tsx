'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Eraser, Info, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildPages } from '@/lib/sdv/mock-data'
import type { BusinessRecord, DocumentState, RecordDocument, RedactionMark } from '@/lib/sdv/types'
import { countMatches, DocumentCanvas, PAGE_W } from './document-canvas'
import { Button } from './primitives'
import { RedactionDialog } from './redaction-dialog'
import { ViewerInspector } from './viewer-inspector'
import { DocumentSearch, ViewerToolbar, type ZoomMode } from './viewer-toolbar'

type Props = {
  record: BusinessRecord
  document: RecordDocument
  pageCount: number
  state: DocumentState
  canDownload: boolean
  canPrint: boolean
  canRedact: boolean
  canComment: boolean
  canTag: boolean
  onSelectDocument: (documentId: string) => void
  onDownload: () => void
  onPrint: () => void
  onSearched: () => void
  onAddComment: (text: string) => void
  onAddTag: (tag: string) => void
  onRedact: (marks: RedactionMark[], reason: string) => void
  onViewActivity: () => void
  onBack: () => void
}

export function ViewerView(props: Props) {
  const { record, document, pageCount, state } = props
  const pages = useMemo(() => buildPages(record, document.originalFilename, pageCount), [record, document.originalFilename, pageCount])

  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const inlineSearchRef = useRef<HTMLInputElement>(null)

  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState<ZoomMode>('fit')
  const [containerWidth, setContainerWidth] = useState(800)
  const [desktopInspector, setDesktopInspector] = useState(true)
  const [mobileInspector, setMobileInspector] = useState(false)
  const [query, setQuery] = useState('')
  const [activeMatch, setActiveMatch] = useState(0)
  const [floatingSearch, setFloatingSearch] = useState(false)
  const [redactMode, setRedactMode] = useState(false)
  const [staged, setStaged] = useState<RedactionMark[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const matches = useMemo(() => countMatches(pages, query), [pages, query])
  const fitScale = Math.min(2, Math.max(0.35, (containerWidth - 48) / PAGE_W))
  const scale = zoom === 'fit' ? fitScale : zoom / 100

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!matches.length) return
    scrollRef.current?.querySelector('[data-active-match]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeMatch, matches.length])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        if (window.innerWidth >= 1280) inlineSearchRef.current?.focus()
        else setFloatingSearch(true)
      }
      if (event.key === 'Escape' && redactMode && !confirmOpen && staged.length === 0) setRedactMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [redactMode, confirmOpen, staged.length])

  const goTo = (target: number) => {
    const clamped = Math.min(pageCount, Math.max(1, target))
    pageRefs.current[clamped - 1]?.scrollIntoView({ block: 'start' })
    setPage(clamped)
  }

  const onScroll = () => {
    const container = scrollRef.current
    if (!container) return
    const probe = container.scrollTop + container.clientHeight * 0.35
    let current = 1
    pageRefs.current.forEach((element, index) => {
      if (element && element.offsetTop <= probe) current = index + 1
    })
    if (current !== page) setPage(current)
  }

  const toggleInspector = () => {
    if (window.innerWidth >= 1280) setDesktopInspector((open) => !open)
    else setMobileInspector((open) => !open)
  }

  const enterRedaction = () => {
    setRedactMode(true)
    setStaged([])
  }

  const exitRedaction = () => {
    setRedactMode(false)
    setStaged([])
    setConfirmOpen(false)
  }

  const search = {
    query,
    matchIndex: activeMatch,
    matchCount: matches.length,
    onQuery: (value: string) => {
      setQuery(value)
      setActiveMatch(0)
    },
    onNext: () => matches.length && setActiveMatch((index) => (index + 1) % matches.length),
    onPrev: () => matches.length && setActiveMatch((index) => (index - 1 + matches.length) % matches.length),
    onSubmit: props.onSearched,
  }

  const stagedPages = new Set(staged.map((mark) => mark.pageNumber)).size

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">Document viewer — {document.originalFilename}</h1>
      {redactMode ? (
        <div role="toolbar" aria-label="Redaction tools" className="no-print flex h-13 shrink-0 items-center gap-2 overflow-x-auto border-b border-[#f3c4bf] bg-danger-bg px-3">
          <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-destructive px-2 py-1 text-[12px] font-semibold text-white">
            <Eraser className="size-3.5" aria-hidden="true" />Redaction mode
          </span>
          <p className="hidden min-w-0 truncate text-[13px] text-[#7a271a] md:block">Drag over content to mark it for permanent removal. Nothing changes until you review and apply.</p>
          <span className="ml-auto shrink-0 text-[13px] font-medium text-[#7a271a] tabular-nums" aria-live="polite">
            {staged.length} {staged.length === 1 ? 'area' : 'areas'}
            {staged.length > 0 && ` · ${stagedPages} ${stagedPages === 1 ? 'page' : 'pages'}`}
          </span>
          <Button variant="ghost" size="sm" disabled={!staged.length} onClick={() => setStaged((marks) => marks.slice(0, -1))} className="text-[#7a271a]">
            <Undo2 aria-hidden="true" />Undo
          </Button>
          <Button variant="ghost" size="sm" disabled={!staged.length} onClick={() => setStaged([])} className="text-[#7a271a]">Clear all</Button>
          <Button variant="secondary" size="sm" onClick={exitRedaction}>Cancel</Button>
          <Button variant="danger" size="sm" disabled={!staged.length} onClick={() => setConfirmOpen(true)}>Review &amp; apply</Button>
        </div>
      ) : (
        <ViewerToolbar
          documents={record.documents}
          documentId={document.documentId}
          onSelectDocument={props.onSelectDocument}
          onBack={props.onBack}
          page={page}
          pageCount={pageCount}
          onGoTo={goTo}
          zoom={zoom}
          scale={scale}
          onZoom={setZoom}
          search={{ ...search, inputRef: inlineSearchRef }}
          onOpenFloatingSearch={() => setFloatingSearch(true)}
          canDownload={props.canDownload}
          canPrint={props.canPrint}
          canRedact={props.canRedact}
          onDownload={props.onDownload}
          onPrint={props.onPrint}
          onRedact={enterRedaction}
          inspectorOpen={desktopInspector}
          inspectorCount={state.comments.length}
          onToggleInspector={toggleInspector}
        />
      )}

      <div className="flex min-h-0 flex-1">

        <div className="relative min-w-0 flex-1">
          {floatingSearch && !redactMode && (
            <div className="no-print absolute top-3 right-5 z-10 w-[min(20rem,calc(100%-2.5rem))] xl:hidden">
              <DocumentSearch {...search} autoFocus className="shadow-lg" onClose={() => setFloatingSearch(false)} />
            </div>
          )}
          {redactMode && staged.length === 0 && (
            <div className="no-print pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-strong/90 px-3 py-1.5 text-[12.5px] text-white shadow-lg">
                <Info className="size-3.5" aria-hidden="true" />Click and drag on the page to draw a redaction area
              </span>
            </div>
          )}
          <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-auto bg-canvas" tabIndex={0} aria-label="Document pages">
            <DocumentCanvas
              pages={pages}
              scale={scale}
              query={redactMode ? '' : query}
              activeMatch={activeMatch}
              applied={state.redactions}
              staged={staged}
              redactMode={redactMode}
              onAddMark={(mark) => setStaged((marks) => [...marks, mark])}
              onRemoveMark={(id) => setStaged((marks) => marks.filter((mark) => mark.id !== id))}
              registerPage={(index, element) => {
                pageRefs.current[index] = element
              }}
            />
          </div>
        </div>

        <ViewerInspector
          record={record}
          document={document}
          pageCount={pageCount}
          state={state}
          canComment={props.canComment}
          canTag={props.canTag}
          desktopOpen={desktopInspector}
          mobileOpen={mobileInspector}
          onClose={() => setMobileInspector(false)}
          onAddComment={props.onAddComment}
          onAddTag={props.onAddTag}
          onViewActivity={props.onViewActivity}
        />
      </div>

      <RedactionDialog
        open={confirmOpen}
        filename={document.originalFilename}
        marks={staged}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={(reason) => {
          props.onRedact(staged, reason)
          exitRedaction()
        }}
      />
    </div>
  )
}

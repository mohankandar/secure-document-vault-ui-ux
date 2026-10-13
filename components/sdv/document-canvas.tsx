'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentPage, RedactionMark } from '@/lib/sdv/types'

export const PAGE_W = 612
export const PAGE_H = 792

type Props = {
  pages: DocumentPage[]
  scale: number
  query: string
  activeMatch: number
  applied: RedactionMark[]
  staged: RedactionMark[]
  redactMode: boolean
  onAddMark: (mark: RedactionMark) => void
  onRemoveMark: (id: string) => void
  registerPage: (index: number, element: HTMLDivElement | null) => void
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function countMatches(pages: DocumentPage[], query: string) {
  if (query.trim().length < 2) return []
  const pattern = new RegExp(escapeRegex(query.trim()), 'gi')
  const locations: number[] = []
  pages.forEach((page, pageIndex) => {
    for (const text of [page.heading, ...page.blocks]) {
      const found = text.match(pattern)
      if (found) found.forEach(() => locations.push(pageIndex))
    }
  })
  return locations
}

function transformFor(scale: number) {
  return { transform: `scale(${scale})`, box: { width: PAGE_W * scale, height: PAGE_H * scale } }
}

export function DocumentCanvas({ pages, scale, query, activeMatch, applied, staged, redactMode, onAddMark, onRemoveMark, registerPage }: Props) {
  const { transform, box } = transformFor(scale)
  const trimmed = query.trim()
  const pattern = trimmed.length >= 2 ? new RegExp(`(${escapeRegex(trimmed)})`, 'gi') : null
  let matchCounter = 0

  const highlight = (text: string): ReactNode => {
    if (!pattern) return text
    return text.split(pattern).map((part, index) => {
      if (index % 2 === 0) return part
      const current = matchCounter === activeMatch
      matchCounter += 1
      return (
        <mark key={index} data-active-match={current || undefined} className={cn('rounded-[1px] text-inherit', current ? 'bg-[#f79009] ring-2 ring-[#f79009]' : 'bg-[#fde272]')}>
          {part}
        </mark>
      )
    })
  }

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-6">
      {pages.map((page, index) => (
        <div
          key={index}
          ref={(element) => registerPage(index, element)}
          data-page={index + 1}
          aria-label={`Page ${index + 1} of ${pages.length}`}
          role="region"
          className="relative shrink-0 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.12),0_0_0_1px_rgba(16,24,40,0.06)]"
          style={box}
        >
          <div className="absolute top-0 left-0 origin-top-left" style={{ width: PAGE_W, height: PAGE_H, transform }}>
            <article className="h-full px-14 py-14 font-serif text-[11px] leading-[1.65] text-[#1d2939] select-text">
              <div className="mb-6 flex items-start justify-between border-b border-[#d0d5dd] pb-3">
                <div>
                  <p className="font-sans text-[8px] font-semibold tracking-[0.18em] text-[#667085] uppercase">Northbridge Financial · LexaVault</p>
                  <h2 className="mt-1 font-sans text-[16px] font-semibold text-[#101828]">{highlight(page.heading)}</h2>
                </div>
                <span className="font-sans text-[8px] text-[#98a2b3] tabular-nums">
                  {index + 1} / {pages.length}
                </span>
              </div>
              {page.blocks.map((block, blockIndex) => (
                <p key={blockIndex} className={cn('mb-4', index === 0 && blockIndex === 0 && 'rounded-sm bg-[#f2f4f7] px-2 py-1.5 font-sans text-[9.5px] font-medium text-[#344054] tabular-nums')}>
                  {highlight(block)}
                </p>
              ))}
              <div className="absolute inset-x-14 bottom-10 flex justify-between border-t border-[#eaecf0] pt-2 font-sans text-[7.5px] text-[#98a2b3]">
                <span>Confidential — retained under source retention policy</span>
                <span>Page {index + 1}</span>
              </div>
            </article>

            {applied.filter((mark) => mark.pageNumber === index + 1).map((mark) => (
              <div key={mark.id} className="absolute bg-[#0b0f17]" style={markStyle(mark)} aria-label="Permanently redacted area" role="img" />
            ))}

            <RedactionLayer
              enabled={redactMode}
              pageNumber={index + 1}
              marks={staged.filter((mark) => mark.pageNumber === index + 1)}
              scale={scale}
              onAddMark={onAddMark}
              onRemoveMark={onRemoveMark}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const markStyle = (mark: RedactionMark) => ({
  left: mark.x * PAGE_W,
  top: mark.y * PAGE_H,
  width: mark.width * PAGE_W,
  height: mark.height * PAGE_H,
})

type Draft = { startX: number; startY: number; x: number; y: number }

function RedactionLayer({ enabled, pageNumber, marks, scale, onAddMark, onRemoveMark }: { enabled: boolean; pageNumber: number; marks: RedactionMark[]; scale: number; onAddMark: (mark: RedactionMark) => void; onRemoveMark: (id: string) => void }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  const point = (event: ReactPointerEvent) => {
    const rect = layerRef.current!.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    }
  }

  const onPointerDown = (event: ReactPointerEvent) => {
    if (!enabled || event.button !== 0) return
    if ((event.target as HTMLElement).closest('[data-mark]')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const p = point(event)
    setDraft({ startX: p.x, startY: p.y, x: p.x, y: p.y })
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!draft) return
    const p = point(event)
    setDraft({ ...draft, x: p.x, y: p.y })
  }

  const onPointerUp = () => {
    if (!draft) return
    const mark = {
      id: `m-${Date.now()}`,
      pageNumber,
      x: Math.min(draft.startX, draft.x),
      y: Math.min(draft.startY, draft.y),
      width: Math.abs(draft.x - draft.startX),
      height: Math.abs(draft.y - draft.startY),
    }
    setDraft(null)
    if (mark.width * PAGE_W > 6 && mark.height * PAGE_H > 4) onAddMark(mark)
  }

  if (!enabled && marks.length === 0) return null

  const draftMark = draft && { x: Math.min(draft.startX, draft.x), y: Math.min(draft.startY, draft.y), width: Math.abs(draft.x - draft.startX), height: Math.abs(draft.y - draft.startY) }

  return (
    <div
      ref={layerRef}
      className={cn('absolute inset-0', enabled && 'cursor-crosshair touch-none bg-[#b42318]/[0.03]')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDraft(null)}
    >
      {marks.map((mark, index) => (
        <div
          key={mark.id}
          data-mark
          className="group absolute border-2 border-dashed border-[#d92d20] bg-[repeating-linear-gradient(135deg,rgba(217,45,32,0.28)_0_4px,rgba(217,45,32,0.12)_4px_8px)]"
          style={markStyle(mark)}
        >
          <span className="absolute -top-[18px] left-0 rounded-sm bg-[#d92d20] px-1 font-sans text-[9px] leading-[14px] font-semibold text-white" style={{ transform: `scale(${1 / Math.max(scale, 0.6)})`, transformOrigin: 'bottom left' }}>
            {index + 1}
          </span>
          {enabled && (
            <button
              type="button"
              onClick={() => onRemoveMark(mark.id)}
              aria-label={`Remove staged redaction ${index + 1} on page ${pageNumber}`}
              className="absolute -top-2.5 -right-2.5 grid size-5 place-items-center rounded-full bg-[#d92d20] text-white shadow"
              style={{ transform: `scale(${1 / Math.max(scale, 0.6)})` }}
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      ))}
      {draftMark && <div className="pointer-events-none absolute border-2 border-[#d92d20] bg-[#d92d20]/20" style={markStyle(draftMark as RedactionMark)} />}
    </div>
  )
}

'use client'

import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { History, Tag, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/sdv/format'
import type { BusinessRecord, DocumentState, RecordDocument } from '@/lib/sdv/types'
import { Button, Input } from './primitives'

type InspectorTab = 'comments' | 'tags' | 'details'

type Props = {
  record: BusinessRecord
  document: RecordDocument
  pageCount: number
  state: DocumentState
  canComment: boolean
  canTag: boolean
  mobileOpen: boolean
  desktopOpen: boolean
  onClose: () => void
  onAddComment: (text: string) => void
  onAddTag: (tag: string) => void
  onViewActivity: () => void
}

const isComposing = (event: KeyboardEvent) => event.nativeEvent.isComposing || event.keyCode === 229

export function ViewerInspector({ record, document, pageCount, state, canComment, canTag, mobileOpen, desktopOpen, onClose, onAddComment, onAddTag, onViewActivity }: Props) {
  const [tab, setTab] = useState<InspectorTab>('comments')
  const tabs: { id: InspectorTab; label: string; count?: number }[] = [
    { id: 'comments', label: 'Comments', count: state.comments.length },
    { id: 'tags', label: 'Tags', count: state.tags.length },
    { id: 'details', label: 'Details' },
  ]

  return (
    <>
      {mobileOpen && <div className="no-print fixed inset-0 z-40 bg-[#0d1526]/35 backdrop-blur-[1px] xl:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        aria-label="Document information"
        className={cn(
          'no-print flex-col border-l border-border bg-card',
          'fixed inset-y-0 right-0 z-50 w-[min(23rem,92vw)] shadow-[-12px_0_32px_rgb(13_21_38/0.14)] xl:static xl:z-auto xl:w-80 xl:shadow-none 2xl:w-[22rem]',
          mobileOpen ? 'flex' : 'hidden',
          desktopOpen ? 'xl:flex' : 'xl:hidden',
        )}
      >
        <div className="flex h-12 shrink-0 items-stretch border-b border-border pr-1 pl-2" role="tablist" aria-label="Document panels">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`inspector-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`inspector-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-2.5 text-[13px] font-medium text-secondary-text hover:text-strong',
                tab === item.id && 'text-strong after:absolute after:inset-x-1.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary',
              )}
            >
              {item.label}
              {item.count !== undefined && <span className="rounded-full bg-muted px-1.5 text-[11px] leading-[18px] text-secondary-text tabular-nums ring-1 ring-border">{item.count}</span>}
            </button>
          ))}
          <button type="button" onClick={onClose} className="my-auto ml-auto grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-strong xl:hidden" aria-label="Close panel">
            <X className="size-4" />
          </button>
        </div>

        <div id={`inspector-panel-${tab}`} role="tabpanel" aria-labelledby={`inspector-tab-${tab}`} className="flex min-h-0 flex-1 flex-col">
          {tab === 'comments' && <CommentsPanel state={state} canComment={canComment} onAddComment={onAddComment} />}
          {tab === 'tags' && <TagsPanel state={state} canTag={canTag} onAddTag={onAddTag} />}
          {tab === 'details' && <DetailsPanel record={record} document={document} pageCount={pageCount} state={state} onViewActivity={onViewActivity} />}
        </div>
      </aside>
    </>
  )
}

function CommentsPanel({ state, canComment, onAddComment }: { state: DocumentState; canComment: boolean; onAddComment: (text: string) => void }) {
  const [draft, setDraft] = useState('')
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? state.comments : state.comments.slice(0, 3)
  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!draft.trim()) return
    onAddComment(draft.trim())
    setDraft('')
  }

  return (
    <>
      {canComment ? (
        <form onSubmit={submit} className="shrink-0 border-b border-border p-3">
          <label htmlFor="comment-draft" className="sr-only">Add a comment</label>
          <textarea
            id="comment-draft"
            rows={2}
            value={draft}
            maxLength={2000}
            placeholder="Add a comment…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !isComposing(event)) submit()
            }}
            className="w-full resize-none rounded-md border border-input bg-card px-2.5 py-2 text-[13px] text-strong shadow-xs placeholder:text-[#98a2b3] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 focus-visible:outline-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11.5px] text-muted-foreground">Ctrl + Enter to post</span>
            <Button type="submit" size="sm" variant="primary" disabled={!draft.trim()}>Add comment</Button>
          </div>
        </form>
      ) : (
        <p className="shrink-0 border-b border-border px-3 py-2.5 text-[12.5px] text-muted-foreground">Your role can read comments but cannot add them.</p>
      )}
      <ol id="comment-history" className="min-h-0 flex-1 overflow-y-auto" aria-label={showAll ? 'All comments' : 'Latest comments'}>
        {state.comments.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">No comments yet.</li>}
        {visible.map((comment) => (
          <li key={comment.commentId} className="border-b border-border-soft px-3 py-3 last:border-b-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-selected text-[10px] font-semibold text-accent-foreground" aria-hidden="true">
                {comment.createdBy.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 truncate text-[12.5px] font-medium text-strong">{comment.createdBy.split('@')[0]}</span>
              <time dateTime={comment.createdAt} className="ml-auto shrink-0 text-[11.5px] text-muted-foreground tabular-nums">{formatDateTime(comment.createdAt)}</time>
            </div>
            <p className="pl-8 text-[13px] leading-5 text-foreground">{comment.comment}</p>
          </li>
        ))}
      </ol>
      {state.comments.length > 3 && (
        <div className="shrink-0 border-t border-border px-3 py-2">
          <button type="button" aria-controls="comment-history" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)} className="text-[12.5px] font-medium text-primary hover:underline">
            {showAll ? 'Show latest 3' : `View all ${state.comments.length} comments`}
          </button>
        </div>
      )}
    </>
  )
}

function TagsPanel({ state, canTag, onAddTag }: { state: DocumentState; canTag: boolean; onAddTag: (tag: string) => void }) {
  const [draft, setDraft] = useState('')
  const exists = state.tags.some((tag) => tag.tag.toLowerCase() === draft.trim().toLowerCase())
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.trim() || exists) return
    onAddTag(draft.trim())
    setDraft('')
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {canTag ? (
        <form onSubmit={submit} className="mb-3">
          <label htmlFor="tag-draft" className="sr-only">Add a tag</label>
          <div className="flex gap-2">
            <Input id="tag-draft" value={draft} maxLength={80} placeholder="Add a tag" onChange={(e) => setDraft(e.target.value)} className="h-8 text-[13px]" />
            <Button type="submit" size="sm" variant="secondary" disabled={!draft.trim() || exists}>Add</Button>
          </div>
          {exists && <p className="mt-1 text-[11.5px] text-warning">This tag is already applied.</p>}
        </form>
      ) : (
        <p className="mb-3 text-[12.5px] text-muted-foreground">Your role can view tags but cannot add them.</p>
      )}
      {state.tags.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-muted-foreground">No tags applied.</p>
      ) : (
        <ul className="space-y-1.5" aria-label="Applied tags">
          {state.tags.map((tag) => (
            <li key={tag.tagId} className="flex items-center gap-2 rounded-md border border-border-soft px-2.5 py-1.5">
              <Tag className="size-3.5 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-strong">{tag.tag}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{formatDateTime(tag.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DetailsPanel({ record, document, pageCount, state, onViewActivity }: { record: BusinessRecord; document: RecordDocument; pageCount: number; state: DocumentState; onViewActivity: () => void }) {
  const rows = [
    { label: 'File name', value: document.originalFilename },
    { label: 'Pages', value: String(pageCount) },
    { label: 'Ingested', value: formatDateTime(document.ingestedAt) },
    { label: 'Available', value: formatDateTime(document.availableAt) },
    { label: 'Redacted areas', value: String(state.redactions.length) },
    { label: 'Source document ID', value: document.sourceDocumentId ?? '—' },
    { label: 'Document ID', value: document.documentId },
  ]
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <dl className="divide-y divide-border-soft px-3">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 py-2">
            <dt className="shrink-0 text-[12.5px] text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 truncate text-right text-[12.5px] font-medium text-strong tabular-nums" title={row.value}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Business record</p>
      <dl className="divide-y divide-border-soft px-3">
        {[...record.metadata.map((m) => ({ label: m.displayLabel, value: m.value })), { label: 'Source', value: record.sourceDisplayName }].map((row) => (
          <div key={row.label} className="flex justify-between gap-3 py-2">
            <dt className="text-[12.5px] text-muted-foreground">{row.label}</dt>
            <dd className="truncate text-right text-[12.5px] font-medium text-strong tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="p-3">
        <Button size="sm" variant="secondary" className="w-full" onClick={onViewActivity}><History aria-hidden="true" />View document activity</Button>
      </div>
    </div>
  )
}

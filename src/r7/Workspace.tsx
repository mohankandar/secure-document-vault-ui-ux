import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowRight, ChevronDown, ChevronUp, FileText, Search, SlidersHorizontal, X } from 'lucide-react'
import { useStore } from './store'
import { SOURCES, BUSINESS_LIMITS, type Field, type RecordItem } from './data'
import { Badge, Callout, Drawer, Empty, ErrorState, Skeleton, fmtDate, fmtRel, humanize } from './ui'
import { Viewer } from './Viewer'
import './workspace.css'

const MODE_HINT = { EXACT: 'Exact', PREFIX: 'Starts with', PARTIAL: 'Contains' } as const
type Criteria = Record<string, string>
type Applied = { sourceId: string; c: Criteria; from: string; to: string }
type Chip = { key: string; label: string; mode: string; value: string }

/** Below this body width the inspector becomes a drawer instead of a side pane. */
const SPLIT_MIN = 820
const INSPECTOR_MIN = 320
const INSPECTOR_MAX = 720
const INSPECTOR_DEFAULT = 400
const LIST_MIN = 380
const RESIZE_STEP = 24

// Layout preference only — kept in memory so it survives route changes without persisting user data.
let rememberedInspectorWidth = INSPECTOR_DEFAULT

const valueOf = (r: RecordItem, label: string) => [...r.identifiers, ...r.metadata].find((x) => x.label === label)?.value ?? ''
const normalize = (f: Field, v: string) => (f.normalization === 'DIGITS_ONLY' ? v.replace(/\D/g, '') : v.trim().toLowerCase())
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function matches(r: RecordItem, sourceId: string, fields: Field[], c: Criteria, from: string, to: string) {
  if (r.sourceId !== sourceId) return false
  for (const f of fields) {
    const q = c[f.key]?.trim()
    if (!q) continue
    const have = normalize(f, valueOf(r, f.label))
    const want = normalize(f, q)
    if (f.mode === 'EXACT' && have !== want) return false
    if (f.mode === 'PREFIX' && !have.startsWith(want)) return false
    if (f.mode === 'PARTIAL' && !have.includes(want)) return false
  }
  if (from && r.updatedAt.slice(0, 10) < from) return false
  if (to && r.updatedAt.slice(0, 10) > to) return false
  return true
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

export function Workspace() {
  const { records, scenario, selectedRef, setSelectedRef, openDocId, setOpenDocId, can, addDocActivity } = useStore()
  const [bodyRef, bodyWidth] = useElementWidth<HTMLDivElement>()
  const split = bodyWidth >= SPLIT_MIN

  const [sourceId, setSourceId] = useState(SOURCES[0].id)
  const source = SOURCES.find((s) => s.id === sourceId)!
  const fields = source.fields.filter((f) => f.searchable)
  const [draft, setDraft] = useState<Criteria>({ serviceEntity: 'north' })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applied, setApplied] = useState<Applied | null>({ sourceId: SOURCES[0].id, c: { serviceEntity: 'north' }, from: '', to: '' })
  const [editing, setEditing] = useState(false)
  const [touched, setTouched] = useState(false)
  const composerOpen = editing || !applied
  const composerRef = useRef<HTMLFormElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const [inspectorWidth, setInspectorWidthState] = useState(rememberedInspectorWidth)
  const [dragging, setDragging] = useState(false)
  const inspectorMax = Math.max(INSPECTOR_MIN, Math.min(INSPECTOR_MAX, bodyWidth - LIST_MIN))
  const inspectorShown = clamp(inspectorWidth, INSPECTOR_MIN, inspectorMax)
  const setInspectorWidth = (n: number) => {
    const v = clamp(Math.round(n), INSPECTOR_MIN, inspectorMax)
    rememberedInspectorWidth = v
    setInspectorWidthState(v)
  }

  const results = useMemo(() => {
    if (!applied) return []
    const src = SOURCES.find((s) => s.id === applied.sourceId)!
    return records.filter((r) => matches(r, applied.sourceId, src.fields, applied.c, applied.from, applied.to))
  }, [applied, records])

  const selected = records.find((r) => r.ref === selectedRef) ?? null
  const hasCriteria = Object.values(draft).some((v) => v.trim()) || from || to
  const showResults = !!applied && scenario === 'live' && results.length > 0

  const focusFirstField = () => requestAnimationFrame(() => composerRef.current?.querySelector<HTMLInputElement>('.wk-criteria input')?.focus())
  const openComposer = () => { setEditing(true); focusFirstField() }
  const cancelEdit = () => {
    if (applied) { setSourceId(applied.sourceId); setDraft({ ...applied.c }); setFrom(applied.from); setTo(applied.to) }
    setEditing(false)
    setTouched(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!hasCriteria) return
    setApplied({ sourceId, c: { ...draft }, from, to })
    setEditing(false)
    setSelectedRef(null)
  }
  const clear = () => { setDraft({}); setFrom(''); setTo(''); setApplied(null); setSelectedRef(null); setTouched(false); setEditing(false); focusFirstField() }
  const removeChip = (key: string) => {
    if (!applied) return
    const c = { ...applied.c }; delete c[key]
    const next = key === 'from' ? { ...applied, c, from: '' } : key === 'to' ? { ...applied, c, to: '' } : { ...applied, c }
    setDraft(next.c); setFrom(next.from); setTo(next.to)
    const stillApplied = Object.values(next.c).some(Boolean) || next.from || next.to
    setApplied(stillApplied ? next : null)
    if (!stillApplied) focusFirstField()
  }

  const openDoc = (r: RecordItem, docId: string) => {
    setSelectedRef(r.ref)
    setOpenDocId(docId)
    addDocActivity(docId, 'DOCUMENT_VIEWED')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      if (openDocId || document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      setEditing(true)
      focusFirstField()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openDocId])

  const focusRow = (ref: string) => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-ref="${CSS.escape(ref)}"]`)
    el?.focus()
    el?.scrollIntoView({ block: 'nearest' })
  }

  const onListKey = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const focusedRef = (document.activeElement as HTMLElement | null)?.dataset.ref ?? selectedRef
      const idx = results.findIndex((r) => r.ref === focusedRef)
      const nextIdx = idx < 0 ? 0 : clamp(idx + (e.key === 'ArrowDown' ? 1 : -1), 0, results.length - 1)
      const next = results[nextIdx]
      if (!next) return
      if (split) setSelectedRef(next.ref)
      focusRow(next.ref)
    }
    if (e.key === 'Escape' && split && selectedRef) { e.preventDefault(); setSelectedRef(null) }
  }

  const onRowKey = (e: ReactKeyboardEvent<HTMLButtonElement>, r: RecordItem) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return
    if (split && r.ref === selectedRef && can('VIEW_PDF') && r.docs[0]) { e.preventDefault(); openDoc(r, r.docs[0].id) }
  }

  const onSplitPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = inspectorShown
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    setDragging(true)
    const move = (ev: PointerEvent) => setInspectorWidth(startW + (startX - ev.clientX))
    const up = () => { setDragging(false); target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up) }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }
  const onSplitKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = { ArrowLeft: inspectorShown + RESIZE_STEP, ArrowRight: inspectorShown - RESIZE_STEP, Home: inspectorMax, End: INSPECTOR_MIN }
    if (e.key in map) { e.preventDefault(); setInspectorWidth(map[e.key]) }
    if (e.key === 'Enter') { e.preventDefault(); setInspectorWidth(INSPECTOR_DEFAULT) }
  }

  const appliedSource = applied ? SOURCES.find((s) => s.id === applied.sourceId)! : source
  const chips: Chip[] = applied ? [
    ...Object.entries(applied.c).filter(([, v]) => v.trim()).map(([k, v]) => { const f = appliedSource.fields.find((x) => x.key === k)!; return { key: k, label: f.label, mode: MODE_HINT[f.mode], value: v } }),
    ...(applied.from ? [{ key: 'from', label: 'Updated from', mode: '', value: applied.from }] : []),
    ...(applied.to ? [{ key: 'to', label: 'Updated to', mode: '', value: applied.to }] : []),
  ] : []

  const inspectorDocked = split && !!selected

  return (
    <div className="wk">
      <section className="wk-query" aria-label="Search records">
        <div className="wk-query-bar">
          <h1 className="wk-title">Records</h1>
          <span className="wk-divider" aria-hidden />
          <span className="wk-source"><Search size={15} aria-hidden />{appliedSource.name}</span>
          {!composerOpen && chips.length > 0 && (
            <div className="ws-chips wk-chips" aria-label="Applied criteria">
              {chips.map((c) => (
                <span key={c.key} className="ws-chip"><b>{c.label}{c.mode && ` · ${c.mode.toLowerCase()}`}</b>{c.value}
                  <button type="button" onClick={() => removeChip(c.key)} aria-label={`Remove ${c.label}`}><X size={13} /></button>
                </span>
              ))}
            </div>
          )}
          {composerOpen && <span className="wk-query-status">{applied ? 'Editing search' : 'New search'}</span>}
          <div className="wk-query-actions">
            {applied && !composerOpen && (
              <button type="button" className="v-btn sm" onClick={openComposer} aria-expanded="false" aria-controls="wk-composer" aria-keyshortcuts="/">
                <SlidersHorizontal size={15} aria-hidden />Edit search<kbd className="wk-kbd" aria-hidden>/</kbd>
              </button>
            )}
            {applied && composerOpen && (
              <button type="button" className="v-btn quiet sm" onClick={cancelEdit} aria-expanded="true" aria-controls="wk-composer"><ChevronUp size={15} aria-hidden />Close</button>
            )}
          </div>
        </div>

        {composerOpen && (
          <form id="wk-composer" ref={composerRef} className="wk-composer" onSubmit={submit} noValidate
            onKeyDown={(e) => { if (e.key === 'Escape' && applied) { e.preventDefault(); cancelEdit() } }}>
            <div className="wk-composer-grid">
              <label className="v-field">
                <span>Source</span>
                <select className="v-select" value={sourceId} onChange={(e) => { setSourceId(e.target.value); setDraft({}); setTouched(false) }}>
                  {SOURCES.filter((s) => s.status === 'ACTIVE').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <div className="wk-criteria">
                {fields.map((f) => (
                  <label key={f.key} className="v-field">
                    <span>{f.label}<span className="v-hint">{MODE_HINT[f.mode]}</span></span>
                    <input className="v-input" value={draft[f.key] ?? ''} inputMode={f.normalization === 'DIGITS_ONLY' ? 'numeric' : undefined} autoComplete="off" spellCheck={false}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} placeholder={f.identifier ? 'Identifier' : ''} />
                  </label>
                ))}
              </div>
              <fieldset className="v-field wk-dates">
                <legend className="v-label">Last updated</legend>
                <div className="wk-date-row">
                  <input className="v-input" type="date" aria-label="Last updated from" value={from} onChange={(e) => setFrom(e.target.value)} />
                  <span className="faint" aria-hidden>–</span>
                  <input className="v-input" type="date" aria-label="Last updated to" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </fieldset>
            </div>
            {touched && !hasCriteria && <Callout tone="warn" title="Enter at least one criterion">Open-ended browsing isn&apos;t supported. Search by an identifier or field.</Callout>}
            <div className="wk-composer-foot">
              <button type="submit" className="v-btn primary"><Search size={16} aria-hidden />Search</button>
              <button type="button" className="v-btn" onClick={clear}>Clear</button>
              {applied && <button type="button" className="v-btn quiet" onClick={cancelEdit}>Cancel</button>}
              <small className="faint wk-composer-note">Up to {BUSINESS_LIMITS.maxResults} matches. Results include only records your role is authorized to see.</small>
            </div>
          </form>
        )}
      </section>

      <div ref={bodyRef} className={`wk-body${inspectorDocked ? ' split' : ''}${dragging ? ' dragging' : ''}`}
        style={inspectorDocked ? ({ '--wk-insp': `${inspectorShown}px` } as CSSProperties) : undefined}>
        <section className="wk-results" aria-label="Search results">
          <div className="wk-results-head">
            <h2>{applied && scenario === 'live' ? `${results.length} record${results.length === 1 ? '' : 's'}` : 'Results'}</h2>
            {applied && <span className="faint wk-results-src">{appliedSource.name}</span>}
            {showResults && split && (
              <span className="wk-hint" aria-hidden>
                <kbd className="wk-kbd">↑</kbd><kbd className="wk-kbd">↓</kbd> move <kbd className="wk-kbd">Enter</kbd> open <kbd className="wk-kbd">Esc</kbd> close
              </span>
            )}
          </div>
          {scenario === 'loading' ? <Skeleton rows={7} /> : scenario === 'error' ? <ErrorState what="search results" /> : !applied ? (
            <Empty title="Search to begin" icon={<Search size={20} />}>Choose a source and enter an identifier, name or entity. Each field shows how it matches.</Empty>
          ) : scenario === 'empty' || results.length === 0 ? (
            <Empty title="No matching records" action={<button type="button" className="v-btn sm" onClick={openComposer}>Modify search</button>}>
              Exact fields must match in full. Try fewer criteria, or a starts-with field such as last name.
            </Empty>
          ) : (
            <>
              <div className="wk-cols" aria-hidden><span>Record</span><span>Identifiers</span><span>Documents</span></div>
              <ul className="ws-list" ref={listRef} onKeyDown={onListKey} aria-label={`${results.length} matching records`}>
                {results.map((r) => (
                  <li key={r.ref}>
                    <button type="button" className="ws-rec wk-rec" data-ref={r.ref} aria-current={r.ref === selectedRef}
                      onClick={() => setSelectedRef(r.ref === selectedRef && split ? null : r.ref)} onKeyDown={(e) => onRowKey(e, r)}>
                      <span className="ws-stack" aria-hidden><i /><i /><i /><span>{r.docs.length}</span></span>
                      <span className="wk-rec-main">
                        <span className="title">{r.title}</span>
                        <span className="ids">{r.identifiers.map((id) => <span key={id.label}><b>{id.label}</b>{id.value}</span>)}</span>
                        <span className="meta">
                          <span>{r.docs.length} document{r.docs.length === 1 ? '' : 's'}</span>
                          <span>Updated {fmtRel(r.updatedAt)}</span>
                          {r.incomplete && <Badge tone="warn">Incomplete submission</Badge>}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="ws-pager"><span>Showing 1–{results.length} of {results.length}</span><span>Page 1 of 1</span></div>
            </>
          )}
        </section>

        {inspectorDocked && (
          <>
            <div className="wk-split" role="separator" aria-orientation="vertical" aria-label="Resize record inspector" tabIndex={0}
              aria-valuemin={INSPECTOR_MIN} aria-valuemax={inspectorMax} aria-valuenow={inspectorShown}
              title="Drag to resize · double-click to reset"
              onPointerDown={onSplitPointerDown} onKeyDown={onSplitKey} onDoubleClick={() => setInspectorWidth(INSPECTOR_DEFAULT)} />
            <aside className="wk-insp" aria-label="Record inspector">
              <Inspector record={selected} onClose={() => { const ref = selected.ref; setSelectedRef(null); requestAnimationFrame(() => focusRow(ref)) }} onOpen={(id) => openDoc(selected, id)} />
            </aside>
          </>
        )}
      </div>

      {selected && !split && !openDocId && (
        <Drawer eyebrow="Record" title={selected.identifiers[0].value} onClose={() => setSelectedRef(null)}
          footer={can('VIEW_PDF') && selected.docs[0] ? <button type="button" className="v-btn primary" onClick={() => openDoc(selected, selected.docs[0].id)}>Open documents<ArrowRight size={16} aria-hidden /></button> : undefined}>
          <InspectorBody record={selected} onOpen={(id) => openDoc(selected, id)} />
        </Drawer>
      )}
      {selected && openDocId && <Viewer record={selected} results={results} docId={openDocId} onClose={() => setOpenDocId(null)} />}
    </div>
  )
}

function Inspector({ record, onClose, onOpen }: { record: RecordItem; onClose: () => void; onOpen: (id: string) => void }) {
  const { can } = useStore()
  return (
    <>
      <header className="ws-insp-head wk-insp-head">
        <div className="grow stack" style={{ gap: 2, minWidth: 0 }}>
          <span className="eyebrow">Record</span>
          <h2>{record.title}</h2>
        </div>
        {can('VIEW_PDF') && record.docs[0] && (
          <button type="button" className="v-btn primary sm" onClick={() => onOpen(record.docs[0].id)}>Open<ArrowRight size={15} aria-hidden /></button>
        )}
        <button type="button" className="v-btn quiet icon sm" onClick={onClose} aria-label="Close record" aria-keyshortcuts="Escape"><X size={18} /></button>
      </header>
      <div className="ws-insp-body">
        <InspectorBody record={record} onOpen={onOpen} />
      </div>
    </>
  )
}

function InspectorBody({ record, onOpen }: { record: RecordItem; onOpen: (id: string) => void }) {
  const { can } = useStore()
  const [more, setMore] = useState(false)
  const recent = record.docs.flatMap((d) => d.activity.map((a) => ({ ...a, doc: d.kind }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, more ? 8 : 3)
  return (
    <>
      <div className="ws-ids">{record.identifiers.map((i) => <div key={i.label}><span>{i.label}</span><strong>{i.value}</strong></div>)}</div>
      {record.incomplete && (
        <Callout tone="warn" title={`Submission incomplete · ${record.incomplete.received} of ${record.incomplete.expected} documents`}>
          The producer hasn&apos;t delivered every expected document yet. Received documents are already available below.
        </Callout>
      )}
      <div className="stack" style={{ gap: 10 }}>
        <div className="row between"><h3>Documents</h3><span className="faint" style={{ fontSize: 13 }}>{record.docs.length}</span></div>
        <ul className="ws-docs">
          {record.docs.map((d) => (
            <li key={d.id}>
              <button type="button" className="ws-doc" onClick={() => onOpen(d.id)} disabled={!can('VIEW_PDF')}>
                <span className="sheet" aria-hidden />
                <span className="grow" style={{ minWidth: 0 }}>
                  <strong className="truncate">{d.kind}</strong>
                  <span>{d.pages} page{d.pages === 1 ? '' : 's'} · ingested {fmtDate(d.ingestedAt)}{d.redactions.length > 0 && ' · redacted'}</span>
                </span>
                {d.tags.length > 0 && <Badge>{d.tags.length} tag{d.tags.length === 1 ? '' : 's'}</Badge>}
                <FileText size={16} aria-hidden className="faint" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <h3>Details</h3>
        <dl className="v-kv">{record.metadata.map((m) => <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd></div>)}</dl>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        <h3>Recent activity</h3>
        <ol className="v-timeline">
          {recent.map((a) => <li key={a.id}><span className={`pt ${a.simulated ? 'sim' : a.outcome === 'SUCCESS' ? 'ok' : 'bad'}`} aria-hidden /><div className="stack" style={{ gap: 0 }}><strong>{humanize(a.action.replace('DOCUMENT_', ''))} · {a.doc}</strong><span>{a.actor} · {fmtRel(a.at)}{a.simulated && ' · simulated'}</span></div></li>)}
        </ol>
        <button type="button" className="v-btn quiet sm" style={{ alignSelf: 'flex-start' }} onClick={() => setMore((m) => !m)}>{more ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}{more ? 'Show less' : 'Show more'}</button>
      </div>
      {!can('VIEW_PDF') && <Callout tone="warn" title="Viewing isn't assigned">Your role can find this record but not open its documents.</Callout>}
    </>
  )
}

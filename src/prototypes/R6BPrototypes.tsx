import { useState } from 'react'
import Icon from '../Icon'
import './r6b-prototypes.css'

/*
 * R6-B review prototypes. Static sample data only: this screen makes no API calls,
 * writes no audit events and is not reachable from the production workflow.
 * Open with ?prototype=r6b.
 */

type Concept = 'split' | 'toolbar' | 'thumbnails'
type FitMode = 'width' | 'page'

const records = [
  { contract: '100245', member: '88123401', entity: 'Northwind Health Plan', last: 'Alvarez', region: 'West', docs: 3, updated: 'Oct 13, 2026' },
  { contract: '100246', member: '88123402', entity: 'Northwind Health Plan', last: 'Brennan', region: 'West', docs: 1, updated: 'Oct 9, 2026' },
  { contract: '100251', member: '88123477', entity: 'Contoso Benefits', last: 'Chen', region: 'Central', docs: 2, updated: 'Oct 4, 2026' },
]
const documents = ['Member Agreement 2026.pdf', 'Enrollment Form.pdf', 'Rider Amendment.pdf']
const PAGE_COUNT = 4

function PageSheet({ page, compact = false }: { page: number; compact?: boolean }) {
  return (
    <div className={`r6b-sheet ${compact ? 'is-compact' : ''}`} aria-hidden={compact || undefined}>
      <div className="r6b-sheet-title">{page === 1 ? 'MEMBER AGREEMENT' : `Section ${page}`}</div>
      <div className="r6b-sheet-sub">Contract 100245 · Page {page}</div>
      {Array.from({ length: compact ? 6 : 14 }, (_, i) => <span key={i} className="r6b-line" style={{ width: `${62 + ((i * 17) % 34)}%` }} />)}
    </div>
  )
}

function ViewerToolbar({ fit, onFit, page, onPage }: { fit: FitMode; onFit: (fit: FitMode) => void; page: number; onPage: (page: number) => void }) {
  return (
    <div className="r6b-toolbar" role="toolbar" aria-label="Document controls">
      <label className="r6b-doc-select">
        <span className="sr-only">Document</span>
        <Icon name="document" />
        <select defaultValue={documents[0]}>{documents.map((d) => <option key={d}>{d}</option>)}</select>
      </label>
      <span className="r6b-divider" aria-hidden="true" />
      <div className="r6b-pager">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}><Icon name="chevronLeft" /></button>
        <span className="r6b-tabular">{page} / {PAGE_COUNT}</span>
        <button type="button" aria-label="Next page" disabled={page >= PAGE_COUNT} onClick={() => onPage(page + 1)}><Icon name="chevronRight" /></button>
      </div>
      <div className="r6b-segmented" role="group" aria-label="Fit">
        <button type="button" aria-pressed={fit === 'width'} onClick={() => onFit('width')}>Fit width</button>
        <button type="button" aria-pressed={fit === 'page'} onClick={() => onFit('page')}>Fit page</button>
      </div>
      <label className="r6b-find">
        <Icon name="search" />
        <span className="sr-only">Find in document</span>
        <input placeholder="Find in document" />
      </label>
      <div className="r6b-toolbar-end">
        <button type="button" className="r6b-icon-btn" aria-label="Download (permission controlled, audited)" title="Download"><Icon name="download" /></button>
        <button type="button" className="r6b-icon-btn" aria-label="Print (permission controlled, audited)" title="Print"><Icon name="print" /></button>
      </div>
    </div>
  )
}

function Canvas({ fit, page, thumbnails, onPage }: { fit: FitMode; page: number; thumbnails: boolean; onPage: (page: number) => void }) {
  return (
    <div className="r6b-canvas-wrap">
      {thumbnails && (
        <nav className="r6b-thumbs" aria-label="Pages">
          {Array.from({ length: PAGE_COUNT }, (_, i) => i + 1).map((p) => (
            <button key={p} type="button" className={`r6b-thumb ${p === page ? 'active' : ''}`} aria-current={p === page ? 'page' : undefined} aria-label={`Page ${p}`} onClick={() => onPage(p)}>
              <PageSheet page={p} compact />
              <span className="r6b-tabular">{p}</span>
            </button>
          ))}
        </nav>
      )}
      <div className={`r6b-canvas fit-${fit}`}>
        <PageSheet page={page} />
      </div>
    </div>
  )
}

function SecureFooter({ page }: { page: number }) {
  return (
    <div className="r6b-secure">
      <span className="r6b-seal"><Icon name="eye" /> SECURE VIEW</span>
      <span>Member Agreement 2026.pdf</span>
      <span className="r6b-tabular">Page {page} of {PAGE_COUNT}</span>
      <span>Every view, download and print is recorded</span>
    </div>
  )
}

function SplitConcept() {
  const [selected, setSelected] = useState(0)
  const [fit, setFit] = useState<FitMode>('width')
  const [page, setPage] = useState(1)
  const record = records[selected]
  return (
    <div className="r6b-split">
      <section className="r6b-pane r6b-results" aria-label="Results">
        <header className="r6b-pane-head"><strong>3 records</strong><span>Member Last Name: a</span></header>
        <ul role="listbox" aria-label="Matching records">
          {records.map((r, i) => (
            <li key={r.contract} role="option" aria-selected={i === selected} tabIndex={0} className={i === selected ? 'active' : ''}
              onClick={() => { setSelected(i); setPage(1) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(i); setPage(1) } }}>
              <div className="r6b-row-top"><span className="r6b-tabular">{r.contract}</span><span>{r.updated}</span></div>
              <div className="r6b-row-main">{r.last} · {r.entity}</div>
              <div className="r6b-row-meta"><span>{r.region}</span><span className="r6b-tabular">{r.docs} docs</span></div>
            </li>
          ))}
        </ul>
      </section>
      <section className="r6b-pane r6b-inspector" aria-label="Record details">
        <header className="r6b-pane-head"><strong className="r6b-tabular">Contract {record.contract}</strong></header>
        <dl>
          <div><dt>Member number</dt><dd className="r6b-tabular">{record.member}</dd></div>
          <div><dt>Member</dt><dd>{record.last}</dd></div>
          <div><dt>Service entity</dt><dd>{record.entity}</dd></div>
          <div><dt>Region</dt><dd>{record.region}</dd></div>
          <div><dt>Last updated</dt><dd>{record.updated}</dd></div>
        </dl>
        <h3>Documents</h3>
        <ul className="r6b-doclist">
          {documents.slice(0, record.docs).map((d, i) => <li key={d} className={i === 0 ? 'active' : ''}><Icon name="document" />{d}</li>)}
        </ul>
      </section>
      <section className="r6b-pane r6b-viewer" aria-label="Document viewer">
        <ViewerToolbar fit={fit} onFit={setFit} page={page} onPage={setPage} />
        <Canvas fit={fit} page={page} thumbnails={false} onPage={setPage} />
        <SecureFooter page={page} />
      </section>
    </div>
  )
}

function ToolbarConcept() {
  const [fit, setFit] = useState<FitMode>('width')
  const [page, setPage] = useState(1)
  return (
    <div className="r6b-stack">
      <figure className="r6b-figure">
        <figcaption><strong>Before (R5):</strong> two dark rows, 108px, plus a separate footer. The document picker, panel tabs, pager, zoom and find are spread across both rows.</figcaption>
        <div className="r6b-before" aria-hidden="true">
          <div className="r6b-before-row"><span className="r6b-pill">Member Agreement 2026.pdf · 1 of 3</span><span className="r6b-pill">Download</span><span className="r6b-pill">Print</span><span className="r6b-pill">Details · Comments 1 · Tags 1</span></div>
          <div className="r6b-before-row"><span className="r6b-pill">‹ 1 of 4 ›</span><span className="r6b-pill">− 169% + Fit</span><span className="r6b-pill r6b-grow">Search in document</span><span className="r6b-pill">Search</span></div>
        </div>
      </figure>
      <figure className="r6b-figure">
        <figcaption><strong>After (R6-B proposal):</strong> one 48px light row. Details, Comments and Tags move to the docked record panel. Download and Print remain explicit, permission-gated icon buttons.</figcaption>
        <div className="r6b-viewer r6b-viewer-solo">
          <ViewerToolbar fit={fit} onFit={setFit} page={page} onPage={setPage} />
          <Canvas fit={fit} page={page} thumbnails={false} onPage={setPage} />
        </div>
      </figure>
    </div>
  )
}

function ThumbnailConcept() {
  const [fit, setFit] = useState<FitMode>('page')
  const [page, setPage] = useState(1)
  return (
    <div className="r6b-viewer r6b-viewer-solo r6b-viewer-tall">
      <ViewerToolbar fit={fit} onFit={setFit} page={page} onPage={setPage} />
      <Canvas fit={fit} page={page} thumbnails onPage={setPage} />
      <SecureFooter page={page} />
    </div>
  )
}

const concepts: { id: Concept; label: string; summary: string }[] = [
  { id: 'split', label: 'Split workspace', summary: 'Results, record panel and viewer side by side. Selecting a record never leaves the list.' },
  { id: 'toolbar', label: 'Viewer toolbar', summary: 'Two dark toolbar rows become one 48px light row, with explicit Fit width / Fit page.' },
  { id: 'thumbnails', label: 'Page thumbnails', summary: 'Optional page rail for multi-page documents. Shown here with Fit page.' },
]

export default function R6BPrototypes() {
  const [concept, setConcept] = useState<Concept>('split')
  const active = concepts.find((c) => c.id === concept)!
  return (
    <main className="r6b">
      <header className="r6b-header">
        <div>
          <p className="r6b-flag">Prototype for review · sample data · not connected to the workflow</p>
          <h1>R6-B · Document workspace concepts</h1>
          <p className="r6b-summary">{active.summary}</p>
        </div>
        <div className="r6b-concepts" role="tablist" aria-label="Concepts">
          {concepts.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={c.id === concept} onClick={() => setConcept(c.id)}>{c.label}</button>
          ))}
        </div>
      </header>
      <div role="tabpanel" aria-label={active.label}>
        {concept === 'split' && <SplitConcept />}
        {concept === 'toolbar' && <ToolbarConcept />}
        {concept === 'thumbnails' && <ThumbnailConcept />}
      </div>
    </main>
  )
}

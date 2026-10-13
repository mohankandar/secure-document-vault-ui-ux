'use client'

import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { PAGE_COUNTS, PERSONAS, RECORDS, SOURCES, initialActivity, initialDocumentState, type Persona } from '@/lib/sdv/mock-data'
import { emptyCriteria, hasCriteria, runSearch, type SearchCriteria } from '@/lib/sdv/search'
import type { Capability, DocumentActivity, DocumentState, RecordSummary, RedactionMark, WorkflowTab } from '@/lib/sdv/types'
import { ActivityView } from './activity-view'
import { AppSidebar } from './app-sidebar'
import { ResultsView } from './results-view'
import { SearchView } from './search-view'
import { ViewerView } from './viewer-view'
import { WorkflowNav } from './workflow-nav'

const DEMO_SEARCH: SearchCriteria = { ...emptyCriteria(), criteria: { serviceEntity: '001' } }
const DEFAULT_PERSONA: Persona = 'steward'

function initialState(tab: WorkflowTab) {
  if (tab === 'search') return { search: emptyCriteria(), results: null as RecordSummary[] | null, recordRef: '', documentId: '' }
  const results = runSearch(SOURCES[0], DEMO_SEARCH)
  const record = tab === 'results' ? null : RECORDS[0]
  return { search: DEMO_SEARCH, results, recordRef: record?.recordRef ?? '', documentId: record?.documents[0].documentId ?? '' }
}

export function SdvWorkspace({ initialTab }: { initialTab: WorkflowTab }) {
  const [boot] = useState(() => initialState(initialTab))
  const [tab, setTab] = useState<WorkflowTab>(initialTab)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialTab === 'viewer')
  const [mobileNav, setMobileNav] = useState(false)

  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA)
  const [capabilities, setCapabilities] = useState(() => new Set<Capability>(PERSONAS.find((p) => p.value === DEFAULT_PERSONA)!.capabilities))
  const user = PERSONAS.find((p) => p.value === persona)!.user

  const [sourceId, setSourceId] = useState(SOURCES[0].sourceId)
  const [search, setSearch] = useState<SearchCriteria>(boot.search)
  const [submitted, setSubmitted] = useState<SearchCriteria>(boot.search)
  const [error, setError] = useState('')
  const [results, setResults] = useState<RecordSummary[] | null>(boot.results)
  const [recordRef, setRecordRef] = useState(boot.recordRef)
  const [documentId, setDocumentId] = useState(boot.documentId)

  const [documents, setDocuments] = useState<Record<string, DocumentState>>(initialDocumentState)
  const [activity, setActivity] = useState<DocumentActivity[]>(initialActivity)
  const [toast, setToast] = useState('')

  const source = SOURCES.find((item) => item.sourceId === sourceId)
  const record = RECORDS.find((item) => item.recordRef === recordRef) ?? null
  const document = record?.documents.find((item) => item.documentId === documentId) ?? null
  const can = (capability: Capability) => capabilities.has(capability)

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast((current) => (current === message ? '' : current)), 4000)
  }

  const log = (docId: string, action: string, outcome = 'SUCCESS') =>
    setActivity((events) => [
      ...events,
      { auditEventId: `evt-live-${events.length + 1}`, actorType: 'USER', actorId: user, action, occurredAt: new Date().toISOString(), outcome, documentId: docId },
    ])

  const updateDocument = (docId: string, update: (state: DocumentState) => DocumentState) =>
    setDocuments((current) => ({ ...current, [docId]: update(current[docId]) }))

  const goTo = (next: WorkflowTab) => {
    if (next === 'viewer') setSidebarCollapsed(true)
    setMobileNav(false)
    setTab(next)
  }

  const changePersona = (next: Persona) => {
    setPersona(next)
    setCapabilities(new Set(PERSONAS.find((p) => p.value === next)!.capabilities))
  }

  const toggleCapability = (capability: Capability) =>
    setCapabilities((current) => {
      const next = new Set(current)
      if (next.has(capability)) next.delete(capability)
      else next.add(capability)
      return next
    })

  const changeSource = (id: string) => {
    setSourceId(id)
    setSearch(emptyCriteria())
    setResults(null)
    setRecordRef('')
    setDocumentId('')
    setError('')
  }

  const submitSearch = () => {
    if (!source) return
    if (!hasCriteria(search)) {
      setError('Enter at least one field, Date Range, or Last Updated filter.')
      return
    }
    setError('')
    setSubmitted(search)
    setResults(runSearch(source, search))
    setRecordRef('')
    setDocumentId('')
    goTo('results')
  }

  const clearSearch = () => {
    setSearch(emptyCriteria())
    setError('')
  }

  const selectRecord = (ref: string) => {
    const next = RECORDS.find((item) => item.recordRef === ref)
    setRecordRef(ref)
    setDocumentId(next?.documents[0]?.documentId ?? '')
  }

  const openDocument = (docId = documentId) => {
    if (!docId || !can('VIEW_PDF')) return
    setDocumentId(docId)
    log(docId, 'DOCUMENT_VIEW_OPENED')
    goTo('viewer')
  }

  const criteriaSummary = [
    ...(source?.fields ?? []).filter((field) => submitted.criteria[field.fieldKey]?.trim()).map((field) => ({ label: field.displayLabel, value: submitted.criteria[field.fieldKey].trim() })),
    ...(submitted.dateFrom || submitted.dateTo ? [{ label: 'Date Range', value: `${submitted.dateFrom || '…'} – ${submitted.dateTo || '…'}` }] : []),
    ...(submitted.updatedFrom || submitted.updatedTo ? [{ label: 'Last Updated', value: `${submitted.updatedFrom || '…'} – ${submitted.updatedTo || '…'}` }] : []),
  ]

  const recordActivity = record ? activity.filter((event) => record.documents.some((doc) => doc.documentId === event.documentId)) : []

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileNav}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onCloseMobile={() => setMobileNav(false)}
        persona={persona}
        onPersonaChange={changePersona}
        capabilities={capabilities}
        onToggleCapability={toggleCapability}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <WorkflowNav tab={tab} onTab={goTo} resultCount={results?.length ?? null} canOpenViewer={Boolean(document && can('VIEW_PDF'))} record={record} onOpenMenu={() => setMobileNav(true)} />

        <main className={tab === 'viewer' ? 'min-h-0 flex-1 overflow-hidden' : 'min-h-0 flex-1 overflow-y-auto'}>
          {tab === 'search' && (
            <SearchView sources={SOURCES} source={source} search={search} error={error} onSourceChange={changeSource} onChange={setSearch} onSubmit={submitSearch} onClear={clearSearch} />
          )}

          {tab === 'results' && results && (
            <ResultsView
              source={source}
              results={results}
              truncated={false}
              criteriaSummary={criteriaSummary}
              selectedRecord={record}
              selectedDocumentId={documentId}
              canView={can('VIEW_PDF')}
              onSelectRecord={selectRecord}
              onSelectDocument={setDocumentId}
              onOpen={openDocument}
              onModifySearch={() => goTo('search')}
              onViewActivity={() => goTo('activity')}
            />
          )}

          {tab === 'viewer' && record && document && (
            <ViewerView
              key={document.documentId}
              record={record}
              document={document}
              pageCount={PAGE_COUNTS[document.documentId] ?? 1}
              state={documents[document.documentId]}
              canDownload={can('DOWNLOAD_CURRENT_PDF')}
              canPrint={can('PRINT_DOCUMENT')}
              canRedact={can('PERMANENT_REDACTION')}
              canComment={can('ADD_DOCUMENT_COMMENT')}
              canTag={can('ADD_DOCUMENT_TAG')}
              onSelectDocument={openDocument}
              onDownload={() => {
                log(document.documentId, 'DOCUMENT_DOWNLOADED')
                notify(`Download started — ${document.originalFilename}`)
              }}
              onPrint={() => {
                log(document.documentId, 'DOCUMENT_PRINTED')
                window.print()
              }}
              onSearched={() => log(document.documentId, 'DOCUMENT_TEXT_SEARCHED')}
              onAddComment={(text) => {
                updateDocument(document.documentId, (state) => ({
                  ...state,
                  comments: [{ commentId: `c-${Date.now()}`, documentId: document.documentId, comment: text, createdBy: user, createdAt: new Date().toISOString() }, ...state.comments],
                }))
                log(document.documentId, 'DOCUMENT_COMMENT_ADDED')
              }}
              onAddTag={(tag) => {
                updateDocument(document.documentId, (state) => ({
                  ...state,
                  tags: [...state.tags, { tagId: `t-${Date.now()}`, documentId: document.documentId, tag, createdBy: user, createdAt: new Date().toISOString() }],
                }))
                log(document.documentId, 'DOCUMENT_TAG_ADDED')
              }}
              onRedact={(marks: RedactionMark[]) => {
                updateDocument(document.documentId, (state) => ({ ...state, redactions: [...state.redactions, ...marks] }))
                log(document.documentId, 'DOCUMENT_PERMANENTLY_REDACTED')
                notify(`Permanently redacted ${marks.length} ${marks.length === 1 ? 'area' : 'areas'} in ${document.originalFilename}`)
              }}
              onViewActivity={() => goTo('activity')}
              onBack={() => goTo('results')}
            />
          )}

          {tab === 'activity' && record && (
            <ActivityView
              key={documentId}
              record={record}
              activity={recordActivity}
              initialDocumentId={documentId}
              onBack={() => (document && can('VIEW_PDF') ? goTo('viewer') : goTo('results'))}
              onOpenDocument={(docId) => openDocument(docId)}
            />
          )}
        </main>
      </div>

      <div aria-live="polite" className="no-print pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
        {toast && (
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-lg bg-strong px-3.5 py-2.5 text-[13px] text-white shadow-xl">
            <CheckCircle2 className="size-4 text-[#47cd89]" aria-hidden="true" />
            {toast}
            <button type="button" onClick={() => setToast('')} className="ml-1 rounded p-0.5 text-[#98a2b3] hover:text-white" aria-label="Dismiss">
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

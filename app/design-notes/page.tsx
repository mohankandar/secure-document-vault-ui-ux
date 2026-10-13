import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Design notes — SDV workflow redesign',
  description: 'Critique, information architecture and rationale for the Search, Results, Document Viewer and Activity redesign.',
}

const critique = [
  {
    screen: 'Search',
    points: [
      'Source selector, dynamic fields, Date Range and Last Updated sit in one undifferentiated grid, so the identifying fields (Contract / Member Number) carry no more weight than secondary filters.',
      'Validation ("enter at least one field") is only discovered after submit; there is no hint of which fields are exact match vs. prefix.',
      'Search / Clear actions float at the end of a long form rather than staying anchored to it.',
    ],
  },
  {
    screen: 'Results',
    points: [
      'Records and their documents appear in separate stacked panels; on a 1024px screen the document list scrolls below the fold, hiding the primary "Open selected document" action.',
      'Selected-record state is weak — the chosen row is hard to distinguish, and the selected record metadata disappears once the user scrolls.',
      'Every column has equal visual weight, so the record identifier does not read as the row key.',
    ],
  },
  {
    screen: 'Document Viewer',
    points: [
      'Record header, document list, toolbar, metadata and comments are stacked above / around the PDF; on a 1024 × 768 screen the first page starts roughly half-way down.',
      'Comments, Tags and Details permanently occupy space even when the user is only reading.',
      'Download, Print and Permanent Redaction share the same button style; the irreversible action is not distinguished from routine ones.',
      'Redaction drawing, the reason and the confirmation happen in the same space as normal viewing, making it easy to lose track of what is staged.',
    ],
  },
  {
    screen: 'Activity',
    points: [
      'Activity reads as a generic log; it is not obviously scoped to the selected record / document.',
      'A wide table at tablet width forces horizontal scrolling with the most useful column (who/what) cut off.',
      'Filters require an explicit "Apply filters" round-trip and the view-events toggle is visually detached from them.',
    ],
  },
]

const decisions = [
  {
    title: 'One persistent record strip instead of per-screen headers',
    why: 'Contract Number, Member Number, Service Entity and Source live in a single 48px workflow bar that is visible on Results, Viewer and Activity. Users always know which business record they are in, and no screen spends vertical space repeating it.',
  },
  {
    title: 'Viewer: one compact toolbar, document first',
    why: 'Back to Results, document selector, Previous / Next, page input with total, zoom (incl. Fit width), search-in-document, Download, Print and Redact fit in one 48px toolbar. The app sidebar auto-collapses to icons when a document opens. At 1280 × 800 the document canvas gets ~86% of the viewport height.',
  },
  {
    title: 'Details, Comments and Tags in a collapsible right inspector',
    why: 'Tabs keep three panels in one column. Collapse the inspector to read full-width; reopen with one click. At < 1024px it becomes an overlay drawer so it never squeezes the page on iPad portrait.',
  },
  {
    title: 'Comments: latest 3 by default, then scroll inside the inspector',
    why: '"View all N comments" expands the list inside the inspector’s own scroll area, so long histories never push the PDF down.',
  },
  {
    title: 'Redaction is a distinct mode with a confirmation step',
    why: 'Redact is the only red-outlined control in the toolbar: visible, not dominant. Entering redaction swaps the toolbar for a red mode bar with staged-area count, Undo, Clear all and Cancel. Applying requires a review dialog with a per-page summary, a recorded reason and an explicit acknowledgement.',
  },
  {
    title: 'Results: master–detail with a sticky selection panel',
    why: 'The table is the master; the right panel (sticky at ≥ 1024px) shows the selected record’s metadata, its documents and a full-width "Open selected document" button. Below 1024px the panel becomes a fixed bottom bar with a document picker, so the primary action is always in reach.',
  },
  {
    title: 'Search: identifiers first, filters second, actions pinned',
    why: 'Source-driven fields are grouped as "Record identifiers"; Date Range and Last Updated sit in a separate "Filters" group. Each field states its match behaviour. Search / Clear sit in a sticky footer.',
  },
  {
    title: 'Activity: scoped, filter-as-you-go, responsive',
    why: 'Defaults to the open document, can widen to all documents in the record. Action Type, Performed By and Date Range filter instantly. Document view events stay hidden until "Include document view events" is checked. Below 768px the table becomes a stacked list.',
  },
]

const breakpoints = [
  { width: '≥ 1280px (desktop)', viewer: 'Expanded sidebar can be toggled; inspector 320px; inline search box.', results: 'Table + 340px sticky selection panel.' },
  { width: '1024–1279px (laptop / iPad landscape)', viewer: 'Sidebar collapsed to 56px icons; inspector 288px and collapsible; search opens as a floating find bar (Ctrl+F).', results: 'Table + 300px sticky selection panel.' },
  { width: '768–1023px (iPad portrait)', viewer: 'Sidebar becomes a drawer; inspector is an overlay drawer; toolbar labels drop to icons with tooltips.', results: 'Full-width table; selection pinned to a bottom action bar.' },
]

export default function DesignNotesPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 md:px-8">
      <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Secure Document Vault · Design iteration 1</p>
      <h1 className="mt-1 text-xl font-semibold text-strong">Search → Results → Document Viewer → Activity</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-6 text-secondary-text">
        UI/UX-only redesign. Terminology, capabilities, permissions and data shapes match the existing SDV frontend; no backend behaviour changes are implied.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ['Open prototype', '/'],
          ['Results', '/?tab=results'],
          ['Document Viewer', '/?tab=viewer'],
          ['Activity', '/?tab=activity'],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-strong shadow-xs hover:bg-muted">
            {label}<ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <section className="mt-10" aria-labelledby="critique">
        <h2 id="critique" className="text-[15px] font-semibold text-strong">1. Critique of the current UI</h2>
        <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
          {critique.map((item) => (
            <div key={item.screen} className="grid gap-2 p-4 md:grid-cols-[140px_1fr]">
              <h3 className="text-[13px] font-semibold text-strong">{item.screen}</h3>
              <ul className="list-disc space-y-1 pl-4 text-[13px] leading-5 text-secondary-text">
                {item.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="ia">
        <h2 id="ia" className="text-[15px] font-semibold text-strong">2. Information architecture</h2>
        <ol className="mt-3 grid gap-px overflow-hidden rounded-lg border border-border bg-border text-[13px] md:grid-cols-4">
          {[
            ['Search', 'Source → identifiers → filters → Search'],
            ['Results', 'Records table · selected record panel · documents · Open'],
            ['Document Viewer', 'Toolbar · canvas · inspector (Comments / Tags / Details)'],
            ['Activity', 'Scoped to record / document · filters · events'],
          ].map(([title, body], index) => (
            <li key={title} className="bg-card p-3">
              <p className="text-[11px] font-semibold text-muted-foreground tabular-nums">{index + 1}</p>
              <p className="font-semibold text-strong">{title}</p>
              <p className="mt-0.5 text-secondary-text">{body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[13px] text-secondary-text">The business record (Contract Number, Member Number, Service Entity, Source) is the shared context for steps 2–4 and stays visible in the workflow bar.</p>
      </section>

      <section className="mt-10" aria-labelledby="decisions">
        <h2 id="decisions" className="text-[15px] font-semibold text-strong">3–5. Key design decisions and why they are better</h2>
        <dl className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
          {decisions.map((item) => (
            <div key={item.title} className="p-4">
              <dt className="text-[13px] font-semibold text-strong">{item.title}</dt>
              <dd className="mt-1 text-[13px] leading-5 text-secondary-text">{item.why}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10" aria-labelledby="responsive">
        <h2 id="responsive" className="text-[15px] font-semibold text-strong">6–7. Desktop and 1024px / tablet behaviour</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-4 py-2">Width</th>
                <th scope="col" className="px-4 py-2">Document Viewer</th>
                <th scope="col" className="px-4 py-2">Results</th>
              </tr>
            </thead>
            <tbody>
              {breakpoints.map((row) => (
                <tr key={row.width} className="border-b border-border-soft align-top last:border-b-0">
                  <th scope="row" className="px-4 py-2.5 text-left font-medium whitespace-nowrap text-strong">{row.width}</th>
                  <td className="px-4 py-2.5 text-secondary-text">{row.viewer}</td>
                  <td className="px-4 py-2.5 text-secondary-text">{row.results}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 mb-6" aria-labelledby="prototype">
        <h2 id="prototype" className="text-[15px] font-semibold text-strong">Prototype notes</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-5 text-secondary-text">
          <li>Data is mock data shaped like the existing API responses (sources, search fields, records, documents, comments, tags, activity).</li>
          <li>The sidebar lets you switch persona and toggle individual capabilities to see how Download, Print, Permanent Redaction, comments and tags hide or disable.</li>
          <li>The PDF is simulated with HTML pages so the layout, search highlighting and redaction flow can be evaluated without the PDF.js pipeline.</li>
        </ul>
      </section>
    </main>
  )
}

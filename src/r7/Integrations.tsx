import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, FlaskConical, Lock, Pencil, Plus, Power, RefreshCw, Search } from 'lucide-react'
import { useStore } from './store'
import { NOW, type Field, type Source } from './data'
import {
  AUTH_TYPES, EMPTY_LIMITS, EMPTY_OPS, FIELD_TYPES, LIMIT_META, MB, NORMALIZATIONS, NUMERIC_TYPES, PLATFORM_DEFAULTS, SERVER_OPTIONS,
  authLabel, cleanRules, fmtLimit, normLabel, ruleLabel, rulesFor, rulesSummary, simulateSave, typeLabel, validateField, validateIntegration,
  type AuthType, type Errors, type FieldType, type Integration, type Limits, type Normalization, type OpsSummary, type Rules, type SaveError, type SaveKind, type SourceField,
} from './integrations-data'
import { Badge, Callout, Dialog, Drawer, Skeleton, ErrorState, fmtDateTime, fmtRel } from './ui'
import './integrations.css'

type Section = 'configuration' | 'monitoring' | 'contract'
type Notice = { sourceId: string; tone: 'ok' | 'warn'; title: string; body: ReactNode; action?: { label: string; run: () => void } }
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'configuration', label: 'Configuration' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'contract', label: 'Metadata contract' },
]
const NO_PERMISSION = 'Your session lacks CONFIGURE_INGESTION_SOURCES, so integrations are read-only.'

let clock = 0
const nowIso = () => { clock += 1; return new Date(NOW + clock * 60000).toISOString() }

// ---------- shared hooks ----------
function useSave() {
  const { igLab } = useStore()
  const busy = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<SaveError | null>(null)
  const run = async (kind: SaveKind, onOk: (r: { refreshFailed: boolean }) => void) => {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError(null)
    try { onOk(await simulateSave(igLab, kind)) } catch (e) { setError(e as SaveError) } finally { busy.current = false; setSaving(false) }
  }
  return { saving, error, run }
}

function useReturnFocus() {
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    return () => { if (trigger && document.contains(trigger)) trigger.focus() }
  }, [])
}

function SaveErrorCallout({ error }: { error: SaveError }) {
  const title = error.kind === 'validation' ? `Not saved: the server rejected these values (${error.status})` : error.kind === 'forbidden' ? `Not saved: permission denied (${error.status})` : `Not saved: the server is unavailable (${error.status})`
  return (
    <div role="alert">
      <Callout tone="bad" title={title}>
        <span className="mono ig-server-msg">{error.message}</span>{' '}
        {error.kind === 'forbidden' ? 'Ask a tenant administrator to restore your access. ' : ''}Your entries are kept, so you can correct them and save again. <span className="faint">Simulated response.</span>
      </Callout>
    </div>
  )
}

function FieldMsg({ id, error, hint }: { id: string; error?: string; hint?: ReactNode }) {
  if (error) return <small id={id} className="ig-err"><AlertTriangle size={13} aria-hidden />{error}</small>
  return hint ? <small id={id}>{hint}</small> : null
}

function DiscardDialog({ onKeep, onDiscard, what }: { onKeep: () => void; onDiscard: () => void; what: string }) {
  return (
    <Dialog title="Discard unsaved changes?" onClose={onKeep} footer={<><button type="button" className="v-btn" onClick={onKeep} autoFocus>Keep editing</button><button type="button" className="v-btn danger" onClick={onDiscard}>Discard changes</button></>}>
      <p className="muted" style={{ margin: 0 }}>Your edits to {what} have not been saved. Discarding restores the last saved values.</p>
    </Dialog>
  )
}

const syncSourceField = (f: SourceField): Field => ({
  key: f.fieldKey, label: f.displayLabel, type: f.fieldType === 'DATE' || f.fieldType === 'DATETIME' ? 'DATE' : 'STRING', identifier: f.businessIdentifier,
  searchable: f.searchable, mode: f.searchMode ?? 'EXACT', normalization: f.normalization as Field['normalization'], required: f.required,
})

// ---------- Tab root ----------
export function IntegrationsTab() {
  const { integrations, igFields, igOps, igLab, scenario, setIntegrations, setSources, recordAudit, toast } = useStore()
  const list = scenario === 'empty' ? [] : integrations
  const [selectedId, setSelectedId] = useState<string | null>(integrations[0]?.sourceId ?? null)
  const [showDetail, setShowDetail] = useState(false)
  const [section, setSection] = useState<Section>('configuration')
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState<null | (() => void)>(null)
  const [creating, setCreating] = useState(false)
  const [fieldDrawer, setFieldDrawer] = useState<null | { sourceId: string; field: SourceField | null }>(null)
  const [statusTarget, setStatusTarget] = useState<Integration | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [query, setQuery] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null) as React.RefObject<HTMLHeadingElement>

  const selected = list.find((i) => i.sourceId === selectedId) ?? list[0] ?? null
  const filtered = list.filter((i) => `${i.displayName} ${i.sourceKey}`.toLowerCase().includes(query.trim().toLowerCase()))

  const guard = (fn: () => void) => {
    if (editing && dirty) { setPending(() => fn); return }
    setEditing(false); setDirty(false); fn()
  }
  const focusHeading = () => window.setTimeout(() => headingRef.current?.focus(), 30)
  const select = (id: string) => guard(() => {
    setSelectedId(id); setSection('configuration'); setShowDetail(true)
    setNotice((n) => (n?.sourceId === id ? n : null)); focusHeading()
  })
  const reloadNotice = (sourceId: string, what: string): Notice => ({
    sourceId, tone: 'warn', title: `${what} saved, but the latest data could not be reloaded`,
    body: 'The values shown are what you submitted. Reload before making further changes so you are working from the server’s copy. Simulated refresh failure.',
    action: { label: 'Reload', run: () => { setNotice(null); toast({ title: 'Reloaded (simulated)', detail: 'Showing the server’s current configuration.' }) } },
  })

  if (scenario === 'loading') return <div className="ig"><Skeleton rows={6} /></div>
  if (scenario === 'error') return <div className="ig"><ErrorState what="integrations" /></div>

  return (
    <div className="ig">
      <Lab />
      {!igLab.canConfigure && <Callout tone="warn" title="Read-only access">{NO_PERMISSION} Add, edit, disable and field changes are unavailable; monitoring stays visible.</Callout>}

      <div className="ig-split" data-detail={showDetail && selected ? 'true' : 'false'}>
        <nav className="ig-list" aria-label="Integrations">
          <div className="ig-list-head">
            <h2>Integrations <span className="faint">{list.length}</span></h2>
            <button type="button" className="v-btn sm primary" disabled={!igLab.canConfigure} title={igLab.canConfigure ? undefined : NO_PERMISSION} onClick={() => guard(() => setCreating(true))}><Plus size={15} aria-hidden />Add integration</button>
          </div>
          {list.length > 3 && (
            <label className="ig-filter"><Search size={15} aria-hidden /><span className="sr-only">Filter integrations</span><input className="v-input" placeholder="Filter by name or key" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
          )}
          {list.length === 0 ? (
            <div className="ig-empty">
              <p><strong>No integrations yet</strong></p>
              <p className="muted">An integration lets a producer system submit documents to SDV with its own credentials and metadata contract.</p>
              <button type="button" className="v-btn primary" disabled={!igLab.canConfigure} onClick={() => setCreating(true)}><Plus size={15} aria-hidden />Add your first integration</button>
            </div>
          ) : (
            <ul className="ig-items">
              {filtered.map((i) => {
                const count = igFields[i.sourceId]?.length ?? 0
                const current = selected?.sourceId === i.sourceId
                return (
                  <li key={i.sourceId}>
                    <button type="button" className="ig-item" aria-current={current ? 'true' : undefined} onClick={() => select(i.sourceId)}>
                      <span className="ig-item-top"><strong>{i.displayName}</strong><StatusPill status={i.status} /></span>
                      <span className="mono ig-item-key">{i.sourceKey}</span>
                      <span className="ig-item-meta">{authLabel(i.authType)} · {count} {count === 1 ? 'field' : 'fields'}</span>
                    </button>
                  </li>
                )
              })}
              {filtered.length === 0 && <li className="faint ig-nomatch">No integration matches “{query}”.</li>}
            </ul>
          )}
        </nav>

        <section className="ig-detail" aria-labelledby={selected ? `ig-h-${selected.sourceId}` : undefined}>
          {selected ? (
            <Detail
              key={selected.sourceId}
              integration={selected}
              fields={igFields[selected.sourceId] ?? []}
              ops={igOps[selected.sourceId] ?? EMPTY_OPS}
              headingRef={headingRef}
              section={section}
              onSection={(s) => guard(() => setSection(s))}
              onBack={() => guard(() => setShowDetail(false))}
              editing={editing}
              onEdit={() => { setSection('configuration'); setEditing(true) }}
              onEditDone={(refreshFailed) => {
                setEditing(false); setDirty(false)
                if (refreshFailed) setNotice(reloadNotice(selected.sourceId, 'Configuration'))
              }}
              onDirty={setDirty}
              onAddField={() => setFieldDrawer({ sourceId: selected.sourceId, field: null })}
              onReviseField={(f) => setFieldDrawer({ sourceId: selected.sourceId, field: f })}
              onToggleStatus={() => guard(() => setStatusTarget(selected))}
              notice={notice?.sourceId === selected.sourceId ? notice : null}
              onDismissNotice={() => setNotice(null)}
            />
          ) : (
            <div className="ig-empty"><p className="muted">Create an integration to see its configuration, monitoring and metadata contract here.</p></div>
          )}
        </section>
      </div>

      {pending && <DiscardDialog what="this integration’s configuration" onKeep={() => setPending(null)} onDiscard={() => { const next = pending; setPending(null); setEditing(false); setDirty(false); next() }} />}

      {creating && (
        <CreateDrawer
          takenKeys={integrations.map((i) => i.sourceKey)}
          onClose={() => setCreating(false)}
          onCreated={(created, refreshFailed) => {
            setCreating(false)
            setSelectedId(created.sourceId); setSection('contract'); setShowDetail(true); focusHeading()
            setNotice(refreshFailed ? reloadNotice(created.sourceId, 'Integration') : {
              sourceId: created.sourceId, tone: 'ok', title: `${created.displayName} created (simulated)`,
              body: 'It accepts submissions as soon as the producer presents credentials matching the reference. Next, define the metadata the producer must send. An integration can also run with no fields.',
              action: { label: 'Add first field', run: () => setFieldDrawer({ sourceId: created.sourceId, field: null }) },
            })
          }}
        />
      )}

      {fieldDrawer && (() => {
        const owner = integrations.find((i) => i.sourceId === fieldDrawer.sourceId)!
        return (
          <FieldDrawer
            key={`${fieldDrawer.sourceId}:${fieldDrawer.field?.fieldKey ?? 'new'}`}
            integration={owner}
            fields={igFields[owner.sourceId] ?? []}
            ops={igOps[owner.sourceId] ?? EMPTY_OPS}
            field={fieldDrawer.field}
            onSwitchToRevise={(f) => setFieldDrawer({ sourceId: owner.sourceId, field: f })}
            onClose={() => setFieldDrawer(null)}
            onSaved={(refreshFailed) => {
              setFieldDrawer(null)
              setSection('contract')
              setNotice(refreshFailed ? reloadNotice(owner.sourceId, 'Field') : null)
            }}
          />
        )
      })()}

      {statusTarget && (
        <StatusDialog
          integration={statusTarget}
          onClose={() => setStatusTarget(null)}
          onDone={(updated, refreshFailed) => {
            setStatusTarget(null)
            setIntegrations((l) => l.map((x) => (x.sourceId === updated.sourceId ? updated : x)))
            setSources((l) => l.map((x) => (x.id === updated.sourceId ? { ...x, status: updated.status, updatedAt: updated.updatedAt } : x)))
            recordAudit({ action: updated.status === 'DISABLED' ? 'INGESTION_SOURCE_DISABLED' : 'INGESTION_SOURCE_ENABLED', targetType: 'INGESTION_SOURCE', target: updated.sourceKey, outcome: 'SUCCESS', details: { simulated: 'true' } })
            toast({ title: updated.status === 'DISABLED' ? 'Integration disabled (simulated)' : 'Integration enabled (simulated)', detail: updated.displayName })
            if (refreshFailed) setNotice(reloadNotice(updated.sourceId, 'Status change'))
          }}
        />
      )}
    </div>
  )
}

function StatusPill({ status }: { status: Integration['status'] }) {
  return status === 'ACTIVE'
    ? <span className="ig-pill on"><span className="dot" aria-hidden />Active</span>
    : <span className="ig-pill off"><Power size={11} aria-hidden />Disabled</span>
}

// ---------- Prototype lab ----------
function Lab() {
  const { igLab, setIgLab } = useStore()
  const id = useId()
  const active = igLab.server !== 'accept' || igLab.ops !== 'available' || !igLab.canConfigure
  return (
    <details className="au-lab">
      <summary><FlaskConical size={16} aria-hidden /><span className="grow"><strong>Prototype controls</strong> <span className="faint">· simulated backend responses</span></span>{active && <Badge tone="warn">failure scenario on</Badge>}<ChevronDown size={16} className="chev" aria-hidden /></summary>
      <div className="ig-lab-body">
        <label className="v-field"><span>Next save responds with</span>
          <select id={`${id}-srv`} className="v-select" value={igLab.server} onChange={(e) => setIgLab({ ...igLab, server: e.target.value as typeof igLab.server })}>
            {SERVER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="v-field"><span>Operational summary</span>
          <select className="v-select" value={igLab.ops} onChange={(e) => setIgLab({ ...igLab, ops: e.target.value as typeof igLab.ops })}>
            <option value="available">Available</option><option value="unavailable">Unavailable (request fails)</option>
          </select>
        </label>
        <label className="v-check"><input type="checkbox" checked={igLab.canConfigure} onChange={(e) => setIgLab({ ...igLab, canConfigure: e.target.checked })} /><span>Session has CONFIGURE_INGESTION_SOURCES</span></label>
        <p className="au-lab-note faint">Nothing is sent to a server. Saves wait about 0.75 s and then return the response chosen here. The global data scenario (loading, empty, error) in Session &amp; scenarios also applies.</p>
      </div>
    </details>
  )
}

// ---------- Detail ----------
type DetailProps = {
  integration: Integration; fields: SourceField[]; ops: OpsSummary; headingRef: React.RefObject<HTMLHeadingElement>
  section: Section; onSection: (s: Section) => void; onBack: () => void
  editing: boolean; onEdit: () => void; onEditDone: (refreshFailed: boolean) => void; onDirty: (d: boolean) => void
  onAddField: () => void; onReviseField: (f: SourceField) => void; onToggleStatus: () => void
  notice: Notice | null; onDismissNotice: () => void
}

function Detail(p: DetailProps) {
  const { igLab } = useStore()
  const i = p.integration
  const can = igLab.canConfigure
  return (
    <div className="ig-detail-inner">
      <button type="button" className="v-btn quiet sm ig-back" onClick={p.onBack}><ArrowLeft size={15} aria-hidden />All integrations</button>
      <header className="ig-head">
        <div className="ig-head-id">
          <h2 id={`ig-h-${i.sourceId}`} ref={p.headingRef} tabIndex={-1}>{i.displayName}</h2>
          <div className="ig-head-meta">
            <StatusPill status={i.status} />
            <span className="mono">{i.sourceKey}</span>
            <span className="faint">Updated {fmtRel(i.updatedAt)}</span>
          </div>
        </div>
        <div className="ig-head-actions">
          {!p.editing && <button type="button" className="v-btn sm" disabled={!can} title={can ? undefined : NO_PERMISSION} onClick={p.onEdit}><Pencil size={14} aria-hidden />Edit configuration</button>}
          <button type="button" className={`v-btn sm${i.status === 'ACTIVE' ? ' danger-quiet' : ''}`} disabled={!can} title={can ? undefined : NO_PERMISSION} onClick={p.onToggleStatus}>
            <Power size={14} aria-hidden />{i.status === 'ACTIVE' ? 'Disable' : 'Enable'}
          </button>
        </div>
      </header>

      {i.status === 'DISABLED' && <Callout tone="warn" title="Disabled: new submissions are rejected">The ingestion API refuses new submissions and uploads from this producer. Stored documents remain searchable. Enable it to resume intake.</Callout>}

      {p.notice && (
        <div role="status" className={`ig-notice ${p.notice.tone}`}>
          {p.notice.tone === 'ok' ? <CheckCircle2 size={18} aria-hidden /> : <AlertTriangle size={18} aria-hidden />}
          <div className="grow"><strong>{p.notice.title}</strong><p>{p.notice.body}</p></div>
          <div className="ig-notice-actions">
            {p.notice.action && <button type="button" className={`v-btn sm${p.notice.tone === 'ok' ? ' primary' : ''}`} disabled={p.notice.tone === 'ok' && !can} onClick={p.notice.action.run}>{p.notice.tone === 'warn' && <RefreshCw size={14} aria-hidden />}{p.notice.action.label}</button>}
            <button type="button" className="v-btn sm quiet" onClick={p.onDismissNotice}>Dismiss</button>
          </div>
        </div>
      )}

      <SectionTabs value={p.section} onChange={p.onSection} counts={{ contract: p.fields.length }} />

      <div role="tabpanel" id={`ig-panel-${p.section}`} aria-labelledby={`ig-tab-${p.section}`} className="ig-panel">
        {p.section === 'configuration' && (p.editing
          ? <ConfigForm integration={i} onCancel={() => p.onEditDone(false)} onSaved={p.onEditDone} onDirty={p.onDirty} />
          : <ConfigView integration={i} />)}
        {p.section === 'monitoring' && <Monitoring integration={i} ops={p.ops} />}
        {p.section === 'contract' && <Contract integration={i} fields={p.fields} onAdd={p.onAddField} onRevise={p.onReviseField} />}
      </div>
    </div>
  )
}

function SectionTabs({ value, onChange, counts }: { value: Section; onChange: (s: Section) => void; counts: Partial<Record<Section, number>> }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, idx: number) => {
    const n = SECTIONS.length
    const next = e.key === 'ArrowRight' ? (idx + 1) % n : e.key === 'ArrowLeft' ? (idx - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (next < 0) return
    e.preventDefault(); refs.current[next]?.focus(); onChange(SECTIONS[next].id)
  }
  return (
    <div className="ig-tabs" role="tablist" aria-label="Integration sections">
      {SECTIONS.map((s, idx) => (
        <button key={s.id} ref={(el) => { refs.current[idx] = el }} id={`ig-tab-${s.id}`} type="button" role="tab" aria-selected={value === s.id} aria-controls={`ig-panel-${s.id}`} tabIndex={value === s.id ? 0 : -1}
          className="ig-tab" onClick={() => onChange(s.id)} onKeyDown={(e) => onKey(e, idx)}>
          {s.label}{counts[s.id] != null && <span className="ig-tab-count">{counts[s.id]}</span>}
        </button>
      ))}
    </div>
  )
}

// ---------- Configuration ----------
function ConfigView({ integration: i }: { integration: Integration }) {
  const auth = AUTH_TYPES.find((a) => a.value === i.authType)!
  return (
    <div className="ig-groups">
      <section className="ig-group" aria-labelledby="cfg-id">
        <h3 id="cfg-id">Identity</h3>
        <dl className="v-kv cols">
          <div><dt>Display name</dt><dd>{i.displayName}</dd></div>
          <div><dt>Source key</dt><dd><span className="mono">{i.sourceKey}</span> <span className="ig-lock"><Lock size={11} aria-hidden />Cannot be changed</span></dd></div>
          <div><dt>Created</dt><dd>{fmtDateTime(i.createdAt)}</dd></div>
          <div><dt>Last updated</dt><dd>{fmtDateTime(i.updatedAt)}</dd></div>
        </dl>
      </section>
      <section className="ig-group" aria-labelledby="cfg-auth">
        <h3 id="cfg-auth">Producer authentication</h3>
        <dl className="v-kv cols">
          <div><dt>Method</dt><dd>{auth.label}</dd></div>
          <div><dt>Credential reference</dt><dd className="mono">{i.credentialReference}</dd></div>
        </dl>
        <p className="ig-help">{auth.credential} SDV stores only this reference, never a secret.</p>
      </section>
      <section className="ig-group" aria-labelledby="cfg-lim">
        <h3 id="cfg-lim">Intake limits</h3>
        <p className="ig-help">An integration can only tighten the tenant’s platform limits. A blank value uses the platform default.</p>
        <LimitsTable limits={i.limits} />
      </section>
    </div>
  )
}

function LimitsTable({ limits }: { limits: Limits }) {
  return (
    <table className="v-table ig-limits">
      <thead><tr><th>Limit</th><th>This integration</th><th>Effective</th></tr></thead>
      <tbody>{LIMIT_META.map((m) => {
        const own = limits[m.key]
        const eff = own == null ? PLATFORM_DEFAULTS[m.key] : Math.min(own, PLATFORM_DEFAULTS[m.key])
        return (
          <tr key={m.key}>
            <td className="lead" data-label="Limit">{m.label}</td>
            <td data-label="This integration">{own == null ? <span className="faint">Platform default</span> : fmtLimit(m.key, own)}</td>
            <td data-label="Effective">{fmtLimit(m.key, eff)}{own != null && own > PLATFORM_DEFAULTS[m.key] && <span className="faint"> (platform cap)</span>}</td>
          </tr>
        )
      })}</tbody>
    </table>
  )
}

type LimitInputs = Record<keyof Limits, string>
const toInputs = (l: Limits): LimitInputs => Object.fromEntries(LIMIT_META.map((m) => {
  const v = l[m.key]
  return [m.key, v == null ? '' : m.unit === 'MB' ? String(+(v / MB).toFixed(2)) : String(v)]
})) as LimitInputs
const fromInputs = (inp: LimitInputs): { limits: Limits; errors: Errors } => {
  const errors: Errors = {}
  const limits = { ...EMPTY_LIMITS }
  for (const m of LIMIT_META) {
    const raw = inp[m.key].trim()
    if (!raw) continue
    const n = Number(raw)
    if (!Number.isFinite(n)) { errors[`limit.${m.key}`] = `${m.label} must be a number.`; continue }
    if (m.unit !== 'MB' && !Number.isInteger(n)) { errors[`limit.${m.key}`] = `${m.label} must be a whole number.`; continue }
    limits[m.key] = m.unit === 'MB' ? Math.round(n * MB) : n
  }
  return { limits, errors }
}

function LimitsInputs({ value, onChange, errors, show }: { value: LimitInputs; onChange: (v: LimitInputs) => void; errors: Errors; show: boolean }) {
  const id = useId()
  return (
    <div className="ig-limit-grid">
      {LIMIT_META.map((m) => {
        const err = show ? errors[`limit.${m.key}`] : undefined
        return (
          <label key={m.key} className="v-field">
            <span>{m.label}</span>
            <div className="ig-unit">
              <input className={`v-input${err ? ' invalid' : ''}`} inputMode="decimal" value={value[m.key]} placeholder={fmtLimit(m.key, PLATFORM_DEFAULTS[m.key]).replace(/ \S+$/, '')}
                aria-invalid={!!err} aria-describedby={`${id}-${m.key}`} onChange={(e) => onChange({ ...value, [m.key]: e.target.value })} />
              <span aria-hidden>{m.unit}</span>
            </div>
            <FieldMsg id={`${id}-${m.key}`} error={err} hint={<>{m.hint} Platform default: {fmtLimit(m.key, PLATFORM_DEFAULTS[m.key])}.</>} />
          </label>
        )
      })}
    </div>
  )
}

function AuthChoice({ value, onChange, name }: { value: AuthType; onChange: (a: AuthType) => void; name: string }) {
  return (
    <fieldset className="ig-auth">
      <legend>Authentication method</legend>
      {AUTH_TYPES.map((a) => (
        <label key={a.value} className="ig-auth-opt" data-checked={value === a.value}>
          <input type="radio" name={name} value={a.value} checked={value === a.value} onChange={() => onChange(a.value)} />
          <span><strong>{a.label}</strong><small>{a.credential}</small></span>
        </label>
      ))}
    </fieldset>
  )
}

function ConfigForm({ integration: i, onCancel, onSaved, onDirty }: { integration: Integration; onCancel: () => void; onSaved: (refreshFailed: boolean) => void; onDirty: (d: boolean) => void }) {
  const { setIntegrations, setSources, recordAudit, toast } = useStore()
  const { saving, error, run } = useSave()
  const id = useId()
  const initial = useMemo(() => ({ displayName: i.displayName, authType: i.authType, credentialReference: i.credentialReference, limits: toInputs(i.limits) }), [i])
  const [v, setV] = useState(initial)
  const [tried, setTried] = useState(false)
  const [ack, setAck] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const dirty = JSON.stringify(v) !== JSON.stringify(initial)
  const authChanged = v.authType !== i.authType || v.credentialReference.trim() !== i.credentialReference
  const parsed = fromInputs(v.limits)
  const errors = { ...validateIntegration({ sourceKey: i.sourceKey, displayName: v.displayName, credentialReference: v.credentialReference, limits: parsed.limits }, { isNew: false, takenKeys: [] }), ...parsed.errors }
  const hasErrors = Object.keys(errors).length > 0
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])
  useEffect(() => { nameRef.current?.focus() }, [])

  const save = () => {
    setTried(true)
    if (hasErrors || (authChanged && i.status === 'ACTIVE' && !ack)) return
    run('updateSource', ({ refreshFailed }) => {
      const updated: Integration = { ...i, displayName: v.displayName.trim(), authType: v.authType, credentialReference: v.credentialReference.trim(), limits: parsed.limits, updatedAt: nowIso() }
      setIntegrations((l) => l.map((x) => (x.sourceId === i.sourceId ? updated : x)))
      setSources((l) => l.map((x) => (x.id === i.sourceId ? { ...x, name: updated.displayName, authType: updated.authType, credentialRef: updated.credentialReference, updatedAt: updated.updatedAt } : x)))
      recordAudit({ action: 'INGESTION_SOURCE_UPDATED', targetType: 'INGESTION_SOURCE', target: i.sourceKey, outcome: 'SUCCESS', details: { simulated: 'true' } })
      toast({ title: 'Configuration saved (simulated)', detail: updated.displayName })
      onSaved(refreshFailed)
    })
  }
  const blocked = authChanged && i.status === 'ACTIVE' && !ack

  return (
    <form className="ig-form" noValidate onSubmit={(e) => { e.preventDefault(); save() }} aria-busy={saving}>
      {error && <SaveErrorCallout error={error} />}
      {tried && hasErrors && <div role="alert" className="ig-err-summary">Fix {Object.keys(errors).length === 1 ? 'the highlighted field' : `${Object.keys(errors).length} highlighted fields`} before saving.</div>}
      <section className="ig-group">
        <h3>Identity</h3>
        <label className="v-field"><span>Display name</span>
          <input ref={nameRef} className={`v-input${tried && errors.displayName ? ' invalid' : ''}`} value={v.displayName} aria-invalid={tried && !!errors.displayName} aria-describedby={`${id}-name`} onChange={(e) => setV({ ...v, displayName: e.target.value })} />
          <FieldMsg id={`${id}-name`} error={tried ? errors.displayName : undefined} hint="Shown to administrators and operators." />
        </label>
        <div className="v-field"><span>Source key</span><div className="ig-readonly mono">{i.sourceKey}<span className="ig-lock"><Lock size={11} aria-hidden />Cannot be changed</span></div><small>Producers send this key with every submission, so it is fixed once created.</small></div>
      </section>
      <section className="ig-group">
        <h3>Producer authentication</h3>
        <AuthChoice value={v.authType} name={`${id}-auth`} onChange={(a) => setV({ ...v, authType: a })} />
        <label className="v-field"><span>Credential reference</span>
          <input className={`v-input mono${tried && errors.credentialReference ? ' invalid' : ''}`} value={v.credentialReference} aria-invalid={tried && !!errors.credentialReference} aria-describedby={`${id}-cred`} onChange={(e) => setV({ ...v, credentialReference: e.target.value })} />
          <FieldMsg id={`${id}-cred`} error={tried ? errors.credentialReference : undefined} hint={<>A pointer to where the credential lives, e.g. <span className="mono">{AUTH_TYPES.find((a) => a.value === v.authType)!.example}</span>. Never paste a secret.</>} />
        </label>
        {authChanged && i.status === 'ACTIVE' && (
          <Callout tone="warn" title="This changes how the producer authenticates">
            Once you save, submissions using the old {v.authType !== i.authType ? 'method' : 'credential'} are rejected. Coordinate the switch with the producer team.
            <label className="v-check ig-ack"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>The producer is ready to switch at the same time.</span></label>
          </Callout>
        )}
      </section>
      <section className="ig-group">
        <h3>Intake limits <span className="faint ig-opt">optional</span></h3>
        <LimitsInputs value={v.limits} onChange={(l) => setV({ ...v, limits: l })} errors={errors} show={tried} />
      </section>
      <p className="ig-help ig-concurrency"><AlertTriangle size={13} aria-hidden />The backend does not detect concurrent edits, so the last save wins. If another administrator may be editing this integration, reload before saving.</p>
      <div className="ig-savebar">
        <span className="faint ig-savebar-state" aria-live="polite">{saving ? 'Saving…' : blocked ? 'Confirm the authentication change to save.' : dirty ? 'Unsaved changes' : 'No changes yet'}</span>
        <button type="button" className="v-btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="v-btn primary" disabled={saving || !dirty || blocked}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  )
}

function CreateDrawer({ takenKeys, onClose, onCreated }: { takenKeys: string[]; onClose: () => void; onCreated: (i: Integration, refreshFailed: boolean) => void }) {
  useReturnFocus()
  const { setIntegrations, setIgFields, setIgOps, setSources, recordAudit, toast } = useStore()
  const { saving, error, run } = useSave()
  const id = useId()
  const [v, setV] = useState({ displayName: '', sourceKey: '', authType: 'OAUTH2_CLIENT_CREDENTIALS' as AuthType, credentialReference: '', limits: toInputs(EMPTY_LIMITS) })
  const [keyTouched, setKeyTouched] = useState(false)
  const [showLimits, setShowLimits] = useState(false)
  const [tried, setTried] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { nameRef.current?.focus() }, [])
  const parsed = fromInputs(v.limits)
  const errors = { ...validateIntegration({ ...v, limits: parsed.limits }, { isNew: true, takenKeys }), ...parsed.errors }
  const dirty = !!(v.displayName || v.sourceKey || v.credentialReference || Object.values(v.limits).some(Boolean))
  const err = (k: string) => (tried || (k === 'sourceKey' && keyTouched && v.sourceKey) ? errors[k] : undefined)
  const close = () => (dirty && !saving ? setConfirmClose(true) : onClose())

  const suggestKey = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^[^a-z]+/, '').slice(0, 80)
  const submit = () => {
    setTried(true)
    if (Object.keys(errors).length) { if (errors.limits || Object.keys(errors).some((k) => k.startsWith('limit.'))) setShowLimits(true); return }
    run('createSource', ({ refreshFailed }) => {
      const at = nowIso()
      const created: Integration = { sourceId: `src-${v.sourceKey}`, sourceKey: v.sourceKey, displayName: v.displayName.trim(), status: 'ACTIVE', authType: v.authType, credentialReference: v.credentialReference.trim(), limits: parsed.limits, createdAt: at, updatedAt: at }
      setIntegrations((l) => [...l, created])
      setIgFields((m) => ({ ...m, [created.sourceId]: [] }))
      setIgOps((m) => ({ ...m, [created.sourceId]: { ...EMPTY_OPS } }))
      setSources((l) => [...l, { id: created.sourceId, key: created.sourceKey, name: created.displayName, status: 'ACTIVE', authType: created.authType, credentialRef: created.credentialReference, createdAt: at, updatedAt: at, submissions: 0, documents: 0, lastActivityAt: at, fields: [] } satisfies Source])
      recordAudit({ action: 'INGESTION_SOURCE_CREATED', targetType: 'INGESTION_SOURCE', target: created.sourceKey, outcome: 'SUCCESS', details: { simulated: 'true' } })
      toast({ title: 'Integration created (simulated)', detail: created.displayName })
      onCreated(created, refreshFailed)
    })
  }

  return (
    <>
      <Drawer eyebrow="Tenant IT · Integrations" title="Add integration" onClose={close} footer={<>
        <span className="faint ig-savebar-state" aria-live="polite">{saving ? 'Creating…' : 'Simulated save'}</span>
        <button type="button" className="v-btn" onClick={close} disabled={saving}>Cancel</button>
        <button type="submit" form={`${id}-form`} className="v-btn primary" disabled={saving}>{saving ? 'Creating…' : 'Create integration'}</button>
      </>}>
        <form id={`${id}-form`} className="ig-form" noValidate onSubmit={(e) => { e.preventDefault(); submit() }} aria-busy={saving}>
          <p className="muted ig-intro">Register a producer system. You can define its metadata contract right after creating it, or leave it with no fields.</p>
          {error && <SaveErrorCallout error={error} />}
          {tried && Object.keys(errors).length > 0 && <div role="alert" className="ig-err-summary">Fix {Object.keys(errors).length === 1 ? 'the highlighted field' : `${Object.keys(errors).length} highlighted fields`} to create the integration.</div>}
          <section className="ig-group">
            <h3>Identity</h3>
            <label className="v-field"><span>Display name</span>
              <input ref={nameRef} className={`v-input${err('displayName') ? ' invalid' : ''}`} value={v.displayName} placeholder="e.g. Policy Administration" aria-invalid={!!err('displayName')} aria-describedby={`${id}-name`}
                onChange={(e) => setV({ ...v, displayName: e.target.value, sourceKey: keyTouched ? v.sourceKey : suggestKey(e.target.value) })} />
              <FieldMsg id={`${id}-name`} error={err('displayName')} />
            </label>
            <label className="v-field"><span>Source key</span>
              <input className={`v-input mono${err('sourceKey') ? ' invalid' : ''}`} value={v.sourceKey} placeholder="policy-administration" aria-invalid={!!err('sourceKey')} aria-describedby={`${id}-key`} autoCapitalize="off" spellCheck={false}
                onChange={(e) => { setKeyTouched(true); setV({ ...v, sourceKey: e.target.value.trim() }) }} />
              <FieldMsg id={`${id}-key`} error={err('sourceKey')} hint={<><Lock size={11} aria-hidden style={{ verticalAlign: -1 }} /> Permanent. Lowercase letters, digits and hyphens. Producers send it with every submission.</>} />
            </label>
          </section>
          <section className="ig-group">
            <h3>Producer authentication</h3>
            <AuthChoice value={v.authType} name={`${id}-auth`} onChange={(a) => setV({ ...v, authType: a })} />
            <label className="v-field"><span>Credential reference</span>
              <input className={`v-input mono${err('credentialReference') ? ' invalid' : ''}`} value={v.credentialReference} placeholder={AUTH_TYPES.find((a) => a.value === v.authType)!.example.replace('<source-key>', v.sourceKey || '<source-key>')}
                aria-invalid={!!err('credentialReference')} aria-describedby={`${id}-cred`} onChange={(e) => setV({ ...v, credentialReference: e.target.value })} />
              <FieldMsg id={`${id}-cred`} error={err('credentialReference')} hint="Reference only. Never paste a secret, key or certificate." />
            </label>
          </section>
          <section className="ig-group">
            <button type="button" className="ig-disclose" aria-expanded={showLimits} onClick={() => setShowLimits((s) => !s)}>
              <ChevronDown size={16} aria-hidden /><span className="grow"><strong>Intake limits</strong> <span className="faint">optional · platform defaults apply</span></span>
            </button>
            {showLimits && <LimitsInputs value={v.limits} onChange={(l) => setV({ ...v, limits: l })} errors={errors} show={tried} />}
          </section>
          <Callout tone="sim" title="New integrations start Active">The backend always creates integrations as Active. Disable it afterwards if the producer is not ready.</Callout>
        </form>
      </Drawer>
      {confirmClose && <DiscardDialog what="the new integration" onKeep={() => setConfirmClose(false)} onDiscard={onClose} />}
    </>
  )
}

function StatusDialog({ integration: i, onClose, onDone }: { integration: Integration; onClose: () => void; onDone: (i: Integration, refreshFailed: boolean) => void }) {
  useReturnFocus()
  const { igOps } = useStore()
  const { saving, error, run } = useSave()
  const [ack, setAck] = useState(false)
  const disabling = i.status === 'ACTIVE'
  const ops = igOps[i.sourceId]
  const confirm = () => run('updateSource', ({ refreshFailed }) => onDone({ ...i, status: disabling ? 'DISABLED' : 'ACTIVE', updatedAt: nowIso() }, refreshFailed))
  return (
    <Dialog title={disabling ? `Disable ${i.displayName}?` : `Enable ${i.displayName}?`} onClose={saving ? () => {} : onClose} footer={<>
      <button type="button" className="v-btn" onClick={onClose} disabled={saving}>Cancel</button>
      <button type="button" className={`v-btn ${disabling ? 'danger' : 'primary'}`} disabled={saving || (disabling && !ack)} onClick={confirm}>{saving ? 'Saving…' : disabling ? 'Disable integration' : 'Enable integration'}</button>
    </>}>
      {error && <SaveErrorCallout error={error} />}
      {disabling ? (
        <>
          <ul className="ig-impact">
            <li><strong>New submissions and uploads are rejected.</strong> The ingestion API answers <span className="mono">409 · Ingestion source is not active</span>.</li>
            <li><strong>Open submissions stall.</strong> Documents still expected cannot be uploaded until you enable it again.</li>
            <li><strong>Stored documents are unaffected.</strong> {ops ? `${ops.documentCount.toLocaleString()} documents` : 'Existing documents'} stay searchable, viewable and under retention.</li>
            <li><strong>Configuration is kept.</strong> The credential reference, limits and metadata contract are unchanged, so you can enable it again later.</li>
          </ul>
          {ops?.lastActivityAt && Date.parse(ops.lastActivityAt) > NOW - 86400000 && <Callout tone="warn" title="This producer is actively sending">Last activity was {fmtRel(ops.lastActivityAt)}. Tell the producer team before disabling.</Callout>}
          <label className="v-check"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} autoFocus /><span>I have reviewed the impact on <span className="mono">{i.sourceKey}</span>.</span></label>
        </>
      ) : (
        <p className="muted" style={{ margin: 0 }}>Intake resumes as soon as you save. Check that the producer’s credential still matches <span className="mono">{i.credentialReference}</span>.</p>
      )}
    </Dialog>
  )
}

// ---------- Monitoring ----------
function Monitoring({ integration: i, ops }: { integration: Integration; ops: OpsSummary }) {
  const { igLab } = useStore()
  const [retrying, setRetrying] = useState(false)
  const retry = () => { setRetrying(true); window.setTimeout(() => setRetrying(false), 700) }
  if (retrying) return <Skeleton rows={3} />
  if (igLab.ops === 'unavailable') {
    return (
      <div role="alert">
        <Callout tone="bad" title="Operational summary unavailable">
          Counts and activity times for {i.displayName} couldn’t be loaded. Configuration and the metadata contract are unaffected. Simulated failure of <span className="mono">GET …/operations</span>.
          <div><button type="button" className="v-btn sm ig-retry" onClick={retry}><RefreshCw size={14} aria-hidden />Retry</button></div>
        </Callout>
      </div>
    )
  }
  const never = ops.submissionCount === 0 && !ops.lastActivityAt
  const recentFailure = ops.lastProcessingFailureAt && Date.parse(ops.lastProcessingFailureAt) > NOW - 86400000
  const when = (v: string | null, none: string) => (v ? <><span>{fmtRel(v)}</span> <span className="faint">· {fmtDateTime(v)}</span></> : <span className="faint">{none}</span>)
  return (
    <div className="ig-groups">
      {never && <Callout title="No traffic yet">This integration hasn’t received a submission. Counts and times appear after the producer’s first call.</Callout>}
      <div className="ig-stats">
        <div className="ig-stat"><span>Submissions</span><strong>{ops.submissionCount.toLocaleString()}</strong></div>
        <div className="ig-stat"><span>Documents</span><strong>{ops.documentCount.toLocaleString()}</strong></div>
      </div>
      <dl className="v-kv">
        <div><dt>Last activity</dt><dd>{when(ops.lastActivityAt, 'None recorded')}</dd></div>
        <div><dt>Last document available</dt><dd>{when(ops.lastDocumentAvailableAt, 'No document has completed processing')}</dd></div>
        <div><dt>Last processing failure</dt><dd>{ops.lastProcessingFailureAt ? <>{recentFailure && <Badge tone="warn">within 24 h</Badge>} {when(ops.lastProcessingFailureAt, '')}</> : <span className="faint">No failures recorded</span>}</dd></div>
      </dl>
      {recentFailure && <p className="ig-help">Investigate failed documents in Platform Operations → Incidents. Tenant IT can’t retry processing from here.</p>}
      <p className="ig-help faint">Read-only summary. Per-document detail, retries and incidents are owned by Platform Operations.</p>
    </div>
  )
}

// ---------- Metadata contract ----------
function Contract({ integration: i, fields, onAdd, onRevise }: { integration: Integration; fields: SourceField[]; onAdd: () => void; onRevise: (f: SourceField) => void }) {
  const { igLab } = useStore()
  const can = igLab.canConfigure
  return (
    <div className="ig-groups">
      <div className="ig-contract-head">
        <p className="ig-help" style={{ margin: 0 }}>
          The metadata <strong>{i.displayName}</strong> must send with each submission, checked at intake. Business Administration decides which fields are searchable and how. That appears here read-only.
        </p>
        <button type="button" className="v-btn sm primary" disabled={!can} title={can ? undefined : NO_PERMISSION} onClick={onAdd}><Plus size={15} aria-hidden />Add field</button>
      </div>
      {fields.length === 0 ? (
        <div className="ig-empty">
          <p><strong>No metadata fields</strong></p>
          <p className="muted">Submissions are accepted without metadata. Records from this integration can’t be found by business search until fields are defined and Business Administration enables them.</p>
          <button type="button" className="v-btn primary" disabled={!can} onClick={onAdd}><Plus size={15} aria-hidden />Add first field</button>
        </div>
      ) : (
        <table className="v-table ig-fields">
          <caption className="sr-only">Metadata fields for {i.displayName}</caption>
          <thead><tr><th>Field</th><th>Type</th><th>Normalization</th><th>Validation</th><th>Business search</th><th className="num">Version</th><th className="act"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{fields.map((f) => (
            <tr key={f.fieldKey}>
              <td className="lead" data-label="Field">
                <div className="ig-fcell"><span className="ig-flabel">{f.displayLabel}{f.required && <span className="ig-req">Required</span>}</span><span className="mono faint">{f.fieldKey}</span></div>
              </td>
              <td data-label="Type">{typeLabel(f.fieldType)}</td>
              <td data-label="Normalization">{f.normalization === 'NONE' ? <span className="faint">None</span> : normLabel(f.normalization)}</td>
              <td data-label="Validation">{rulesSummary(f.rules) ? <span className="ig-rules">{rulesSummary(f.rules)}</span> : <span className="faint">Type check only</span>}</td>
              <td data-label="Business search">{f.searchable ? <span className="ig-biz">{f.businessIdentifier ? 'Identifier' : 'Searchable'} · {f.searchMode?.toLowerCase()}</span> : <span className="faint">Not enabled</span>}</td>
              <td className="num" data-label="Version">v{f.version}</td>
              <td className="act"><button type="button" className="v-btn sm" disabled={!can} title={can ? undefined : NO_PERMISSION} onClick={() => onRevise(f)} aria-label={`Revise ${f.displayLabel}`}><Pencil size={14} aria-hidden />Revise</button></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      <p className="ig-help faint">Fields can’t be deleted. A revision creates a new version and retires the previous one. Already-stored values aren’t re-validated.</p>
    </div>
  )
}

type RuleInputs = Record<keyof Rules, string>
const RULE_KEYS: (keyof Rules)[] = ['exactLength', 'minLength', 'maxLength', 'min', 'max', 'pattern']
const toRuleInputs = (r: Rules): RuleInputs => Object.fromEntries(RULE_KEYS.map((k) => [k, r[k] == null ? '' : String(r[k])])) as RuleInputs
const fromRuleInputs = (inp: RuleInputs, t: FieldType): { rules: Rules; errors: Errors } => {
  const errors: Errors = {}
  const rules: Rules = {}
  for (const k of rulesFor(t)) {
    const raw = inp[k]
    if (k === 'pattern') { if (raw) rules.pattern = raw; continue }
    if (!raw.trim()) continue
    const n = Number(raw)
    if (!Number.isFinite(n)) errors[`rule.${k}`] = `${ruleLabel[k]} must be a number.`
    else rules[k] = n
  }
  return { rules, errors }
}
const describeRules = (r: Rules) => rulesSummary(r) || 'none'

function testSample(raw: string, f: { fieldType: FieldType; normalization: Normalization; rules: Rules; required: boolean }): { ok: boolean; normalized?: string; message: string } {
  if (!raw.trim()) return f.required ? { ok: false, message: 'Rejected: the field is required.' } : { ok: true, message: 'Accepted: the field is optional, so it can be empty.' }
  const v = raw.trim()
  const typeOk = {
    TEXT: true, INTEGER: /^[+-]?\d+$/.test(v), DECIMAL: /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(v), DATE: /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)),
    DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(v), BOOLEAN: /^(true|false)$/i.test(v),
    EMAIL: (() => { const at = v.indexOf('@'); return at > 0 && at < v.length - 1 && v.indexOf('.', at) >= at + 2 })(), UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  }[f.fieldType]
  if (!typeOk) return { ok: false, message: `Rejected: not a valid ${typeLabel(f.fieldType).toLowerCase()} value.` }
  const n = { NONE: raw, TRIM: raw.trim(), UPPERCASE: raw.toUpperCase(), LOWERCASE: raw.toLowerCase(), DIGITS_ONLY: raw.replace(/\D/g, '') }[f.normalization]
  const r = f.rules
  if (r.exactLength != null && n.length !== r.exactLength) return { ok: false, normalized: n, message: `Rejected: must be exactly ${r.exactLength} characters after normalization.` }
  if (r.minLength != null && n.length < r.minLength) return { ok: false, normalized: n, message: `Rejected: shorter than ${r.minLength} characters.` }
  if (r.maxLength != null && n.length > r.maxLength) return { ok: false, normalized: n, message: `Rejected: longer than ${r.maxLength} characters.` }
  if (r.pattern) { try { if (!new RegExp(`^(?:${r.pattern})$`).test(n)) return { ok: false, normalized: n, message: 'Rejected: doesn’t match the pattern.' } } catch { return { ok: false, message: 'Pattern is invalid.' } } }
  if (NUMERIC_TYPES.includes(f.fieldType)) {
    const num = Number(n)
    if (r.min != null && num < r.min) return { ok: false, normalized: n, message: `Rejected: below the minimum of ${r.min}.` }
    if (r.max != null && num > r.max) return { ok: false, normalized: n, message: `Rejected: above the maximum of ${r.max}.` }
  }
  return { ok: true, normalized: n, message: 'Accepted.' }
}

function FieldDrawer({ integration: i, fields, ops, field, onClose, onSaved, onSwitchToRevise }: {
  integration: Integration; fields: SourceField[]; ops: OpsSummary; field: SourceField | null
  onClose: () => void; onSaved: (refreshFailed: boolean) => void; onSwitchToRevise: (f: SourceField) => void
}) {
  useReturnFocus()
  const { setIgFields, setSources, recordAudit, toast } = useStore()
  const { saving, error, run } = useSave()
  const id = useId()
  const isNew = field == null
  const initial = useMemo(() => ({
    fieldKey: field?.fieldKey ?? '', displayLabel: field?.displayLabel ?? '', fieldType: field?.fieldType ?? ('TEXT' as FieldType),
    required: field?.required ?? false, normalization: field?.normalization ?? ('TRIM' as Normalization), rules: toRuleInputs(field?.rules ?? {}),
  }), [field])
  const [v, setV] = useState(initial)
  const [tried, setTried] = useState(false)
  const [keyTouched, setKeyTouched] = useState(false)
  const [ack, setAck] = useState(false)
  const [sample, setSample] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)
  useEffect(() => { firstRef.current?.focus() }, [])

  const parsed = fromRuleInputs(v.rules, v.fieldType)
  const rules = cleanRules(parsed.rules, v.fieldType)
  const errors = { ...validateField({ ...v, rules }, { isNew, takenKeys: fields.map((f) => f.fieldKey), integrationName: i.displayName }), ...parsed.errors }
  const hasErrors = Object.keys(errors).length > 0
  const err = (k: string) => (tried || (k === 'fieldKey' && keyTouched && v.fieldKey) || k === 'normalization' ? errors[k] : undefined)
  const dirty = JSON.stringify(v) !== JSON.stringify(initial)
  const duplicate = isNew ? fields.find((f) => f.fieldKey.toLowerCase() === v.fieldKey.toLowerCase()) : undefined
  const dropped = field ? (Object.keys(field.rules) as (keyof Rules)[]).filter((k) => !rulesFor(v.fieldType).includes(k)) : []
  const live = i.status === 'ACTIVE' && ops.submissionCount > 0

  const changes = field ? [
    v.displayLabel.trim() !== field.displayLabel && { label: 'Display label', from: field.displayLabel, to: v.displayLabel.trim(), breaking: false },
    v.fieldType !== field.fieldType && { label: 'Type', from: typeLabel(field.fieldType), to: typeLabel(v.fieldType), breaking: true },
    v.required !== field.required && { label: 'Required', from: field.required ? 'Yes' : 'No', to: v.required ? 'Yes' : 'No', breaking: v.required },
    v.normalization !== field.normalization && { label: 'Normalization', from: normLabel(field.normalization), to: normLabel(v.normalization), breaking: true },
    JSON.stringify(rules) !== JSON.stringify(field.rules) && { label: 'Validation', from: describeRules(field.rules), to: describeRules(rules), breaking: true },
  ].filter(Boolean) as { label: string; from: string; to: string; breaking: boolean }[] : []
  const breaking = changes.some((c) => c.breaking)
  const needsAck = field ? breaking : v.required && live
  const blockedReason = saving ? 'Saving…' : field && changes.length === 0 ? 'Change something to create a new version.' : needsAck && !ack ? 'Acknowledge the contract impact to save.' : ''
  const close = () => (dirty && !saving ? setConfirmClose(true) : onClose())
  const result = sample ? testSample(sample, { ...v, rules }) : null

  const submit = () => {
    setTried(true)
    if (hasErrors || (needsAck && !ack) || (field && changes.length === 0)) return
    run('field', ({ refreshFailed }) => {
      const saved: SourceField = {
        fieldKey: field?.fieldKey ?? v.fieldKey, version: (field?.version ?? 0) + 1, displayLabel: v.displayLabel.trim(), fieldType: v.fieldType, required: v.required,
        normalization: v.normalization, rules, effectiveAt: nowIso(),
        searchable: field?.searchable ?? false, businessIdentifier: field?.businessIdentifier ?? false, searchMode: field?.searchMode ?? null,
      }
      setIgFields((m) => ({ ...m, [i.sourceId]: field ? (m[i.sourceId] ?? []).map((x) => (x.fieldKey === saved.fieldKey ? saved : x)) : [...(m[i.sourceId] ?? []), saved] }))
      setSources((l) => l.map((s) => (s.id !== i.sourceId ? s : { ...s, fields: field ? s.fields.map((x) => (x.key === saved.fieldKey ? syncSourceField(saved) : x)) : [...s.fields, syncSourceField(saved)] })))
      recordAudit({ action: field ? 'METADATA_FIELD_REVISED' : 'METADATA_FIELD_CREATED', targetType: 'METADATA_FIELD', target: `${i.sourceKey}/${saved.fieldKey}`, outcome: 'SUCCESS', details: { version: saved.version, simulated: 'true' } })
      toast({ title: field ? `${saved.displayLabel} revised to v${saved.version} (simulated)` : `${saved.displayLabel} added (simulated)`, detail: field ? undefined : 'Not searchable until Business Administration enables it.' })
      onSaved(refreshFailed)
    })
  }

  return (
    <>
      <Drawer eyebrow={`${i.displayName} · metadata contract`} title={field ? `Revise ${field.displayLabel}` : 'Add metadata field'} onClose={close} footer={<>
        <span className="faint ig-savebar-state" aria-live="polite">{blockedReason || (field ? `Saves as v${field.version + 1}` : 'Simulated save')}</span>
        <button type="button" className="v-btn" onClick={close} disabled={saving}>Cancel</button>
        <button type="submit" form={`${id}-form`} className="v-btn primary" disabled={saving || (!!field && changes.length === 0) || (needsAck && !ack)}>{saving ? 'Saving…' : field ? `Save v${field.version + 1}` : 'Add field'}</button>
      </>}>
        <form id={`${id}-form`} className="ig-form" noValidate onSubmit={(e) => { e.preventDefault(); submit() }} aria-busy={saving}>
          {error && <SaveErrorCallout error={error} />}
          {tried && hasErrors && <div role="alert" className="ig-err-summary">Fix {Object.keys(errors).length === 1 ? 'the highlighted field' : `${Object.keys(errors).length} highlighted fields`} before saving.</div>}
          <section className="ig-group">
            <h3>Definition</h3>
            {isNew ? (
              <label className="v-field"><span>Field key</span>
                <input ref={firstRef} className={`v-input mono${err('fieldKey') ? ' invalid' : ''}`} value={v.fieldKey} placeholder="policyNumber" autoCapitalize="off" spellCheck={false}
                  aria-invalid={!!err('fieldKey')} aria-describedby={`${id}-key`} onChange={(e) => { setKeyTouched(true); setV({ ...v, fieldKey: e.target.value.trim() }) }} />
                <FieldMsg id={`${id}-key`} error={err('fieldKey')} hint={<><Lock size={11} aria-hidden style={{ verticalAlign: -1 }} /> Permanent. The exact key {i.displayName} uses in its submission payload.</>} />
                {duplicate && err('fieldKey') && <button type="button" className="v-btn sm ig-dup" onClick={() => onSwitchToRevise(duplicate)}><Pencil size={14} aria-hidden />Revise “{duplicate.displayLabel}” instead</button>}
              </label>
            ) : (
              <div className="v-field"><span>Field key</span><div className="ig-readonly mono">{field.fieldKey}<span className="ig-lock"><Lock size={11} aria-hidden />Cannot be changed</span></div><small>Current version v{field.version}, effective {fmtDateTime(field.effectiveAt)}.</small></div>
            )}
            <label className="v-field"><span>Display label</span>
              <input ref={isNew ? undefined : firstRef} className={`v-input${err('displayLabel') ? ' invalid' : ''}`} value={v.displayLabel} placeholder="Policy number" aria-invalid={!!err('displayLabel')} aria-describedby={`${id}-label`} onChange={(e) => setV({ ...v, displayLabel: e.target.value })} />
              <FieldMsg id={`${id}-label`} error={err('displayLabel')} />
            </label>
            <div className="ig-row2">
              <label className="v-field"><span>Type</span>
                <select className="v-select" value={v.fieldType} aria-describedby={`${id}-type`} onChange={(e) => setV({ ...v, fieldType: e.target.value as FieldType })}>
                  {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <small id={`${id}-type`}>{FIELD_TYPES.find((t) => t.value === v.fieldType)!.hint}</small>
              </label>
              <label className="v-field"><span>Normalization</span>
                <select className={`v-select${err('normalization') ? ' invalid' : ''}`} value={v.normalization} aria-invalid={!!err('normalization')} aria-describedby={`${id}-norm`} onChange={(e) => setV({ ...v, normalization: e.target.value as Normalization })}>
                  {NORMALIZATIONS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
                <FieldMsg id={`${id}-norm`} error={err('normalization')} hint={NORMALIZATIONS.find((n) => n.value === v.normalization)!.hint} />
              </label>
            </div>
            <label className="v-check ig-required"><input type="checkbox" checked={v.required} onChange={(e) => setV({ ...v, required: e.target.checked })} />
              <span><strong>Required</strong><small>Submissions without this field are rejected at intake.</small></span>
            </label>
          </section>

          <section className="ig-group">
            <h3>Validation <span className="faint ig-opt">optional · checked after normalization</span></h3>
            <div className="ig-rule-grid">
              {rulesFor(v.fieldType).filter((k) => k !== 'pattern').map((k) => {
                const e = tried ? errors[`rule.${k}`] : undefined
                return (
                  <label key={k} className="v-field"><span>{ruleLabel[k]}</span>
                    <input className={`v-input${e ? ' invalid' : ''}`} inputMode="decimal" value={v.rules[k]} aria-invalid={!!e} aria-describedby={`${id}-r-${k}`} onChange={(ev) => setV({ ...v, rules: { ...v.rules, [k]: ev.target.value } })} />
                    <FieldMsg id={`${id}-r-${k}`} error={e} hint={k === 'min' || k === 'max' ? 'Numeric value' : 'Characters'} />
                  </label>
                )
              })}
            </div>
            <label className="v-field"><span>Pattern (regular expression)</span>
              <input className={`v-input mono${tried && errors['rule.pattern'] ? ' invalid' : ''}`} value={v.rules.pattern} placeholder="^[A-Z]{3}-[0-9]{5}$" aria-invalid={tried && !!errors['rule.pattern']} aria-describedby={`${id}-pat`} spellCheck={false} onChange={(e) => setV({ ...v, rules: { ...v.rules, pattern: e.target.value } })} />
              <FieldMsg id={`${id}-pat`} error={tried ? errors['rule.pattern'] : undefined} hint="The whole value must match." />
            </label>
            {dropped.length > 0 && <Callout tone="warn" title="Some existing rules no longer apply">{dropped.map((k) => ruleLabel[k]).join(', ')} only applies to numeric types and will be removed in v{(field?.version ?? 0) + 1}.</Callout>}
            <div className="ig-sample">
              <label className="v-field"><span>Try a sample value</span>
                <input className="v-input mono" value={sample} placeholder="Type what the producer would send" onChange={(e) => setSample(e.target.value)} aria-describedby={`${id}-sample`} />
              </label>
              <p id={`${id}-sample`} className={`ig-sample-out${result ? (result.ok ? ' ok' : ' bad') : ''}`} aria-live="polite">
                {result ? <>{result.ok ? <CheckCircle2 size={14} aria-hidden /> : <AlertTriangle size={14} aria-hidden />}{result.message}{result.normalized != null && result.normalized !== sample && <> Stored as <span className="mono">“{result.normalized}”</span>.</>}</> : <span className="faint">Preview only. Approximates the server’s checks.</span>}
              </p>
            </div>
          </section>

          {field && changes.length > 0 && (
            <section className="ig-group">
              <h3>Changes in v{field.version + 1}</h3>
              <table className="v-table ig-diff">
                <thead><tr><th>Setting</th><th>v{field.version}</th><th>v{field.version + 1}</th></tr></thead>
                <tbody>{changes.map((c) => <tr key={c.label}><td className="lead" data-label="Setting">{c.label}{c.breaking && <span className="ig-req">affects intake</span>}</td><td data-label={`v${field.version}`}><s className="faint">{c.from}</s></td><td data-label={`v${field.version + 1}`}>{c.to}</td></tr>)}</tbody>
              </table>
              <p className="ig-help">Business search settings ({field.searchable ? `${field.searchMode?.toLowerCase()} search` : 'not enabled'}) carry over unchanged.</p>
            </section>
          )}

          {needsAck && (
            <Callout tone="warn" title={field ? 'This revision changes what producers must send' : `${i.displayName} must send this field from now on`}>
              {field
                ? `From the moment v${field.version + 1} is saved, submissions from ${i.sourceKey} that don’t meet it are rejected. Already-stored records aren’t re-validated.`
                : `${i.displayName} is active and has sent ${ops.submissionCount.toLocaleString()} submissions. Any submission without “${v.fieldKey || 'this field'}” is rejected as soon as you save.`}
              <label className="v-check ig-ack"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>I’ve confirmed the producer team is ready for this change.</span></label>
            </Callout>
          )}
          {isNew && <p className="ig-help faint">New fields aren’t searchable. Business Administration decides whether and how {i.displayName} records can be found by this field.</p>}
        </form>
      </Drawer>
      {confirmClose && <DiscardDialog what={field ? `${field.displayLabel}` : 'the new field'} onKeep={() => setConfirmClose(false)} onDiscard={onClose} />}
    </>
  )
}

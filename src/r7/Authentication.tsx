import { useId, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, Circle, Copy, FlaskConical, Loader2, Lock, Pencil, Plus, RotateCcw, XCircle } from 'lucide-react'
import { useStore } from './store'
import { AUTH_SCENARIOS, SERVER_RESPONSES, authFixture, simNow, type AuthScenario, type IdentityConnection, type IdentityOverview } from './auth-data'
import { Callout, Dialog, Drawer, Empty, Scenario, Seg, fmtDateTime, fmtRel } from './ui'
import './authentication.css'

type Phase = 'untested' | 'running' | 'passed' | 'failed' | 'stale'
type Rejection = { code: string; title: string; message: string; retest?: boolean }
type FieldKey = 'displayName' | 'providerId' | 'providerType' | 'issuerUri' | 'browserClientId' | 'apiAudience'

const FIELDS: { key: FieldKey; label: string; mono?: boolean }[] = [
  { key: 'displayName', label: 'Display name' },
  { key: 'providerId', label: 'Provider ID', mono: true },
  { key: 'providerType', label: 'Provider type' },
  { key: 'issuerUri', label: 'Issuer URI', mono: true },
  { key: 'browserClientId', label: 'Browser client ID', mono: true },
  { key: 'apiAudience', label: 'API audience', mono: true },
]
const changedFields = (a: IdentityConnection | null, b: IdentityConnection) => FIELDS.filter((f) => !a || a[f.key] !== b[f.key])
const ageSeconds = (iso: string | null) => (iso ? Math.max(0, (simNow() - Date.parse(iso)) / 1000) : Infinity)
const windowLabel = (s: number) => (s % 60 === 0 ? `${s / 60} minutes` : `${s} seconds`)
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `sim-${Math.random().toString(16).slice(2, 10)}`)

function phaseOf(staged: IdentityConnection, running: boolean, maxAge: number): Phase {
  if (running) return 'running'
  if (staged.lastTestStatus === 'FAILED') return 'failed'
  if (staged.lastTestStatus === 'PASSED') return ageSeconds(staged.lastTestedAt) > maxAge ? 'stale' : 'passed'
  return 'untested'
}

export function AuthenticationTab() {
  const { auth, setAuth, authLab, setAuthLab, toast, recordAudit } = useStore()
  const [running, setRunning] = useState(false)
  const [editor, setEditor] = useState<IdentityConnection | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'activate' | 'rollback'; target: IdentityConnection } | null>(null)
  const [rollbackPick, setRollbackPick] = useState<string | null>(null)

  const { active, staged, rollbackCandidates, activationMaxTestAgeSeconds: maxAge } = auth
  const phase: Phase | null = staged ? phaseOf(staged, running, maxAge) : null

  const loadScenario = (s: AuthScenario) => {
    setAuthLab((l) => ({ ...l, scenario: s })); setAuth(() => authFixture(s)); setRunning(false); setConfirm(null); setEditor(null); setRollbackPick(null)
  }
  const audit = (action: string, target: IdentityConnection, outcome: 'SUCCESS' | 'FAILED') =>
    recordAudit({ action, targetType: 'ENTERPRISE_IDENTITY_CONNECTION', target: target.connectionId, outcome, details: { version: target.configurationVersion, simulated: 'true' } })

  const runTest = () => {
    if (!staged) return
    setRunning(true)
    window.setTimeout(() => {
      const passed = authLab.nextTest === 'PASSED'
      const tested: IdentityConnection = { ...staged, lastTestedAt: new Date(simNow()).toISOString(), lastTestStatus: passed ? 'PASSED' : 'FAILED', lastTestMessage: passed ? 'OIDC discovery document matched the configured issuer.' : 'OIDC discovery returned HTTP 404.' }
      setAuth((s) => ({ ...s, staged: tested })); setRunning(false)
      audit('ENTERPRISE_IDENTITY_CONNECTION_TESTED', tested, passed ? 'SUCCESS' : 'FAILED')
      toast({ title: passed ? `v${staged.configurationVersion} test passed (simulated)` : `v${staged.configurationVersion} test failed (simulated)`, detail: 'No request was sent to an identity provider.' })
    }, 1300)
  }

  const saveDraft = (d: IdentityConnection) => {
    const saved: IdentityConnection = { ...d, status: 'STAGED', updatedAt: new Date(simNow()).toISOString(), lastTestedAt: null, lastTestStatus: null, lastTestMessage: null }
    setAuth((s) => ({ ...s, staged: saved })); setEditor(null)
    audit('ENTERPRISE_IDENTITY_DRAFT_SAVED', saved, 'SUCCESS')
    toast({ title: `Draft v${saved.configurationVersion} saved (simulated)`, detail: 'Live sign-in is unchanged. Test the draft before activating.' })
  }
  const startDraft = () => {
    if (!active) return
    const top = Math.max(active.configurationVersion, ...rollbackCandidates.map((c) => c.configurationVersion))
    setEditor({ ...active, connectionId: uuid(), status: 'STAGED', configurationVersion: top + 1, lastTestedAt: null, lastTestStatus: null, lastTestMessage: null })
  }

  /** Stand-in for the server. Real enforcement (exact version, test freshness, CONFIGURE_TENANT_AUTH) stays in SDV. */
  const submit = (kind: 'activate' | 'rollback', target: IdentityConnection): Promise<Rejection | null> =>
    new Promise((resolve) => window.setTimeout(() => {
      if (authLab.server === 'permission') return resolve({ code: '403', title: 'Not authorized', message: 'The server requires the CONFIGURE_TENANT_AUTH capability for this operation. Your session no longer has it.' })
      if (authLab.server === 'versionMismatch') return resolve({ code: '409', title: 'Version is no longer current', message: `The server expected configuration version ${target.configurationVersion}, but the stored version has changed since this page loaded.` })
      if (kind === 'activate' && ageSeconds(target.lastTestedAt) > maxAge) return resolve({ code: '400', title: 'Test is outside the freshness window', message: `The last passing test is older than ${maxAge} seconds. Run the connection test again, then retry activation.`, retest: true })
      resolve(null)
    }, 800))

  const applyActivate = (target: IdentityConnection) => {
    setAuth((s) => ({ ...s, active: { ...target, status: 'ACTIVE', updatedAt: new Date(simNow()).toISOString() }, staged: null, rollbackCandidates: s.active ? [{ ...s.active, status: 'KNOWN_GOOD' }, ...s.rollbackCandidates] : s.rollbackCandidates }))
    audit('ENTERPRISE_IDENTITY_CONNECTION_ACTIVATED', target, 'SUCCESS')
    toast({ title: `v${target.configurationVersion} is live (simulated)`, detail: 'Only prototype state changed.' })
  }
  const applyRollback = (target: IdentityConnection) => {
    setAuth((s) => ({ ...s, active: { ...target, status: 'ACTIVE', updatedAt: new Date(simNow()).toISOString() }, rollbackCandidates: [...(s.active ? [{ ...s.active, status: 'KNOWN_GOOD' as const }] : []), ...s.rollbackCandidates.filter((c) => c.connectionId !== target.connectionId)] }))
    setRollbackPick(null)
    audit('ENTERPRISE_IDENTITY_CONNECTION_ROLLED_BACK', target, 'SUCCESS')
    toast({ title: `Rolled back to v${target.configurationVersion} (simulated)`, detail: 'Only prototype state changed.' })
  }

  return (
    <div className="au">
      <PrototypeControls scenario={authLab.scenario} onScenario={loadScenario} />
      <Scenario what="identity configuration" rows={8} empty={<NoBinding />}>
        {active ? (
          <>
            <Lifecycle auth={auth} phase={phase} />
            <LiveBinding conn={active} />
            <StagedSection active={active} staged={staged} phase={phase} maxAge={maxAge} activationSupported={auth.activationSupported}
              onEdit={() => staged && setEditor(staged)} onStart={startDraft} onTest={runTest}
              onActivate={() => staged && setConfirm({ kind: 'activate', target: staged })} />
            <Recovery active={active} candidates={rollbackCandidates} pick={rollbackPick} onPick={setRollbackPick}
              onReview={(c) => setConfirm({ kind: 'rollback', target: c })} />
          </>
        ) : <NoBinding />}
      </Scenario>

      {editor && <DraftEditor draft={editor} isNew={!staged} onClose={() => setEditor(null)} onSave={saveDraft} />}
      {confirm && active && (
        <ConfirmChange kind={confirm.kind} from={active} to={confirm.target} maxAge={maxAge} onClose={() => setConfirm(null)} submit={submit}
          onRetest={() => { setConfirm(null); runTest() }}
          onRejected={() => audit(confirm.kind === 'activate' ? 'ENTERPRISE_IDENTITY_CONNECTION_ACTIVATION_FAILED' : 'ENTERPRISE_IDENTITY_CONNECTION_ROLLBACK_FAILED', confirm.target, 'FAILED')}
          onDone={() => { (confirm.kind === 'activate' ? applyActivate : applyRollback)(confirm.target); setConfirm(null) }} />
      )}
    </div>
  )
}

/* ---------- Prototype controls ---------- */

function PrototypeControls({ scenario, onScenario }: { scenario: AuthScenario; onScenario: (s: AuthScenario) => void }) {
  const { authLab, setAuthLab } = useStore()
  const id = useId()
  return (
    <details className="au-lab">
      <summary><FlaskConical size={16} aria-hidden /><span className="grow"><strong>Prototype controls</strong><span className="faint"> · simulated identity data, tests and server responses</span></span><ChevronDown size={16} className="chev" aria-hidden /></summary>
      <div className="au-lab-body">
        <label className="v-field" htmlFor={id}>
          <span>Scenario</span>
          <select id={id} className="v-select" value={scenario} onChange={(e) => onScenario(e.target.value as AuthScenario)}>
            {AUTH_SCENARIOS.map((s) => <option key={s.value} value={s.value}>{s.label} — {s.hint}</option>)}
          </select>
        </label>
        <div className="v-field"><span>Next test result</span><Seg label="Next simulated test result" value={authLab.nextTest} onChange={(v) => setAuthLab((l) => ({ ...l, nextTest: v }))} options={[{ value: 'PASSED', label: 'Pass' }, { value: 'FAILED', label: 'Fail' }]} /></div>
        <div className="v-field"><span>Server response to activate / rollback</span><Seg label="Simulated server response" value={authLab.server} onChange={(v) => setAuthLab((l) => ({ ...l, server: v }))} options={SERVER_RESPONSES} /></div>
        <p className="faint au-lab-note">Nothing here reaches an identity provider or the SDV backend. Loading, error and empty page states are under Session &amp; scenarios.</p>
      </div>
    </details>
  )
}

/* ---------- Lifecycle summary ---------- */

const PHASE_TEXT: Record<Phase, string> = { untested: 'Not tested', running: 'Testing…', passed: 'Test passed', failed: 'Test failed', stale: 'Test outside window' }

function Lifecycle({ auth, phase }: { auth: IdentityOverview; phase: Phase | null }) {
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const { active, staged, rollbackCandidates } = auth
  return (
    <nav className="au-life" aria-label="Identity configuration lifecycle">
      <button type="button" className="au-life-node live" onClick={() => go('au-live')}>
        <span className="au-pill live"><span className="dot" aria-hidden />Live</span>
        <span className="au-life-main"><strong>v{active!.configurationVersion}</strong> {active!.displayName}</span>
        <span className="au-life-sub">Serving sign-in</span>
      </button>
      <ArrowRight size={16} className="au-life-arrow" aria-hidden />
      <button type="button" className={`au-life-node draft${staged ? '' : ' none'}`} onClick={() => go('au-staged')}>
        <span className="au-pill draft">Draft · not live</span>
        <span className="au-life-main">{staged ? <><strong>v{staged.configurationVersion}</strong> {staged.displayName}</> : 'No staged draft'}</span>
        <span className="au-life-sub">{staged && phase ? <PhaseInline phase={phase} /> : 'Start one to change settings'}</span>
      </button>
      <span className="au-life-gap" aria-hidden />
      <button type="button" className="au-life-node rec" onClick={() => go('au-recovery')}>
        <span className="au-pill rec"><RotateCcw size={12} aria-hidden />Recovery</span>
        <span className="au-life-main">{rollbackCandidates.length ? `${rollbackCandidates.length} known-good target${rollbackCandidates.length > 1 ? 's' : ''}` : 'No rollback target'}</span>
        <span className="au-life-sub">{rollbackCandidates.length ? `Latest v${rollbackCandidates[0].configurationVersion}` : 'Recorded after an activation'}</span>
      </button>
    </nav>
  )
}

function PhaseIcon({ phase, size = 16 }: { phase: Phase; size?: number }) {
  if (phase === 'passed') return <CheckCircle2 size={size} className="au-ic ok" aria-hidden />
  if (phase === 'failed') return <XCircle size={size} className="au-ic bad" aria-hidden />
  if (phase === 'stale') return <AlertTriangle size={size} className="au-ic warn" aria-hidden />
  if (phase === 'running') return <Loader2 size={size} className="au-ic spin" aria-hidden />
  return <Circle size={size} className="au-ic idle" aria-hidden />
}
const PhaseInline = ({ phase }: { phase: Phase }) => <span className="row" style={{ gap: 6 }}><PhaseIcon phase={phase} size={14} />{PHASE_TEXT[phase]}</span>

/* ---------- Live binding ---------- */

function CopyValue({ value, label }: { value: string; label: string }) {
  const { toast } = useStore()
  return (
    <span className="au-copy">
      <span className="mono au-val">{value}</span>
      <button type="button" className="v-btn quiet icon sm" aria-label={`Copy ${label}`} title={`Copy ${label}`}
        onClick={() => { void navigator.clipboard?.writeText(value).catch(() => undefined); toast({ title: `${label} copied` }) }}><Copy size={14} aria-hidden /></button>
    </span>
  )
}

function LiveBinding({ conn }: { conn: IdentityConnection }) {
  return (
    <section id="au-live" className="au-card live" aria-labelledby="au-live-h">
      <header className="au-card-head">
        <div className="grow">
          <div className="row wrap" style={{ gap: 10 }}>
            <h2 id="au-live-h">Live binding</h2>
            <span className="au-pill live"><span className="dot" aria-hidden />Live · serving sign-in</span>
          </div>
          <p>The configuration the server trusts for sign-in right now. Saving or testing a draft never changes it.</p>
        </div>
      </header>
      <div className="au-live-lead">
        <span className="au-ver" aria-label={`Configuration version ${conn.configurationVersion}`}>v{conn.configurationVersion}</span>
        <div className="grow">
          <div className="au-live-name">{conn.displayName}</div>
          <div className="faint au-live-meta">{conn.providerType} · <span className="mono">{conn.providerId}</span> · updated {conn.updatedAt ? fmtDateTime(conn.updatedAt) : '—'}</div>
        </div>
      </div>
      <dl className="au-grid">
        <div className="wide"><dt>Issuer URI</dt><dd><CopyValue value={conn.issuerUri} label="issuer URI" /></dd></div>
        <div><dt>Browser client ID</dt><dd><CopyValue value={conn.browserClientId} label="browser client ID" /></dd></div>
        <div><dt>API audience</dt><dd><CopyValue value={conn.apiAudience} label="API audience" /></dd></div>
        <div className="wide"><dt>Connection ID</dt><dd><CopyValue value={conn.connectionId} label="connection ID" /></dd></div>
      </dl>
    </section>
  )
}

/* ---------- Staged draft ---------- */

function StagedSection({ active, staged, phase, maxAge, activationSupported, onEdit, onStart, onTest, onActivate }: {
  active: IdentityConnection; staged: IdentityConnection | null; phase: Phase | null; maxAge: number; activationSupported: boolean
  onEdit: () => void; onStart: () => void; onTest: () => void; onActivate: () => void
}) {
  return (
    <section id="au-staged" className="au-card draft" aria-labelledby="au-staged-h">
      <header className="au-card-head">
        <div className="grow">
          <div className="row wrap" style={{ gap: 10 }}>
            <h2 id="au-staged-h">Staged draft</h2>
            <span className="au-pill draft">Draft · not live</span>
          </div>
          <p>Prepare a change here. It only affects sign-in after a passing test and a confirmed activation.</p>
        </div>
        {staged && <button type="button" className="v-btn sm" onClick={onEdit}><Pencil size={14} aria-hidden />Edit draft</button>}
      </header>
      {!staged || !phase ? (
        <div className="au-nodraft">
          <div className="grow">
            <h3>No staged configuration</h3>
            <p className="muted">Sign-in continues to use live v{active.configurationVersion}. Start a draft from the live settings, change what you need, then test it.</p>
          </div>
          <button type="button" className="v-btn primary" onClick={onStart}><Plus size={16} aria-hidden />Start draft from live</button>
        </div>
      ) : (
        <div className="au-staged-body">
          <Comparison active={active} staged={staged} />
          <Promotion staged={staged} phase={phase} maxAge={maxAge} activationSupported={activationSupported} onTest={onTest} onEdit={onEdit} onActivate={onActivate} />
        </div>
      )}
    </section>
  )
}

function Comparison({ active, staged }: { active: IdentityConnection; staged: IdentityConnection }) {
  const changed = changedFields(active, staged)
  const [showAll, setShowAll] = useState(changed.length === 0)
  const rows = showAll ? FIELDS : changed
  const hidden = FIELDS.length - changed.length
  return (
    <div className="au-diff-wrap">
      <div className="au-sub-head">
        <h3>Changes from live</h3>
        <span className="faint">{changed.length === 0 ? 'Identical to live' : `${changed.length} of ${FIELDS.length} fields differ`}</span>
      </div>
      <table className="au-diff">
        <caption className="sr-only">Live configuration v{active.configurationVersion} compared with draft v{staged.configurationVersion}</caption>
        <thead><tr><th scope="col">Field</th><th scope="col"><span className="au-th live">Live v{active.configurationVersion}</span></th><th scope="col"><span className="au-th draft">Draft v{staged.configurationVersion}</span></th></tr></thead>
        <tbody>
          {rows.map((f) => {
            const diff = active[f.key] !== staged[f.key]
            return (
              <tr key={f.key} className={diff ? 'changed' : ''}>
                <th scope="row">{f.label}{diff && <span className="au-tag">Changed</span>}</th>
                <td data-label={`Live v${active.configurationVersion}`}><span className={f.mono ? 'mono' : ''}>{active[f.key]}</span></td>
                <td data-label={`Draft v${staged.configurationVersion}`}><span className={f.mono ? 'mono' : ''}>{staged[f.key]}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {hidden > 0 && changed.length > 0 && (
        <button type="button" className="v-btn quiet sm au-more" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
          <ChevronDown size={14} aria-hidden style={{ transform: showAll ? 'rotate(180deg)' : undefined }} />{showAll ? 'Hide unchanged fields' : `Show ${hidden} unchanged field${hidden > 1 ? 's' : ''}`}
        </button>
      )}
      <p className="faint au-foot">Connection ID <span className="mono">{staged.connectionId}</span></p>
    </div>
  )
}

function Promotion({ staged, phase, maxAge, activationSupported, onTest, onEdit, onActivate }: {
  staged: IdentityConnection; phase: Phase; maxAge: number; activationSupported: boolean; onTest: () => void; onEdit: () => void; onActivate: () => void
}) {
  const reasonId = useId()
  const v = staged.configurationVersion
  const canRequest = activationSupported && (phase === 'passed' || phase === 'stale')
  const blocked = !activationSupported ? 'Activation is not supported in this environment.'
    : phase === 'untested' ? 'Activation needs a passing connection test of this exact version.'
    : phase === 'running' ? 'Waiting for the test to finish.'
    : phase === 'failed' ? 'The last test failed. Fix the draft and test again.' : null

  return (
    <div className="au-promo">
      <div className="au-sub-head"><h3>Promote v{v} to live</h3></div>
      <ol className="au-steps">
        <li className="done">
          <span className="au-step-ic" aria-hidden><Check size={14} /></span>
          <div className="au-step-body">
            <div className="au-step-title">Draft saved</div>
            <p>v{v} saved {staged.updatedAt ? fmtRel(staged.updatedAt) : ''}. Live sign-in is unaffected.</p>
          </div>
        </li>
        <li className={phase === 'passed' ? 'done' : phase === 'failed' ? 'fail' : phase === 'stale' ? 'warn' : 'current'} aria-live="polite">
          <span className="au-step-ic" aria-hidden><PhaseIcon phase={phase} size={14} /></span>
          <div className="au-step-body">
            <div className="au-step-title">Connection test <span className="au-step-state">· {PHASE_TEXT[phase]}</span></div>
            {phase === 'untested' && <p>Checks that the issuer publishes a valid OIDC discovery document.</p>}
            {phase === 'running' && <p>Requesting the discovery document…</p>}
            {(phase === 'passed' || phase === 'stale' || phase === 'failed') && (
              <p>{staged.lastTestedAt ? `Tested ${fmtRel(staged.lastTestedAt)} · ${fmtDateTime(staged.lastTestedAt)}` : 'Test time not reported'}</p>
            )}
            {phase === 'failed' && staged.lastTestMessage && <div className="au-msg bad"><span className="mono">{staged.lastTestMessage}</span></div>}
            {phase === 'failed' && <p>Check the issuer URI for typos and that the provider is reachable, then test again.</p>}
            {phase === 'stale' && <p>Older than the {windowLabel(maxAge)} the server accepts. Re-run the test before activating, or the server will refuse.</p>}
            {phase === 'passed' && <p>A pass reflects that moment only. The server checks freshness again when you activate.</p>}
            <div className="row wrap au-step-actions">
              <button type="button" className={`v-btn sm${phase === 'untested' ? ' primary' : ''}`} onClick={onTest} disabled={phase === 'running'}>
                {phase === 'running' ? <><Loader2 size={14} className="spin" aria-hidden />Testing…</> : phase === 'untested' ? 'Run connection test' : 'Re-run test'}
              </button>
              {phase === 'failed' && <button type="button" className="v-btn sm" onClick={onEdit}><Pencil size={14} aria-hidden />Edit draft</button>}
              <span className="au-simtag"><FlaskConical size={12} aria-hidden />Simulated</span>
            </div>
          </div>
        </li>
        <li className={canRequest ? 'current' : 'locked'}>
          <span className="au-step-ic" aria-hidden>{canRequest ? <ArrowRight size={14} /> : <Lock size={13} />}</span>
          <div className="au-step-body">
            <div className="au-step-title">Activate v{v}</div>
            <p id={reasonId}>{blocked ?? 'Eligible to request. You will review the change and confirm before anything is sent.'}</p>
            <div className="row wrap au-step-actions">
              <button type="button" className="v-btn sm primary" disabled={!canRequest} aria-describedby={reasonId} onClick={onActivate}>Review activation…</button>
            </div>
          </div>
        </li>
      </ol>
      <p className="faint au-foot">The server is the authority: it re-checks the exact version, test freshness and your permission when you confirm.</p>
    </div>
  )
}

/* ---------- Recovery ---------- */

function diffChips(active: IdentityConnection, c: IdentityConnection) {
  const out: string[] = []
  if (c.issuerUri !== active.issuerUri) out.push('Different issuer')
  if (c.browserClientId !== active.browserClientId) out.push('Different client')
  if (c.apiAudience !== active.apiAudience) out.push('Different audience')
  return out
}

function Recovery({ active, candidates, pick, onPick, onReview }: { active: IdentityConnection; candidates: IdentityConnection[]; pick: string | null; onPick: (id: string) => void; onReview: (c: IdentityConnection) => void }) {
  const selected = candidates.find((c) => c.connectionId === pick) ?? null
  return (
    <section id="au-recovery" className="au-card rec" aria-labelledby="au-rec-h">
      <header className="au-card-head">
        <div className="grow">
          <div className="row wrap" style={{ gap: 10 }}>
            <h2 id="au-rec-h">Known-good rollback</h2>
            <span className="au-pill rec"><RotateCcw size={12} aria-hidden />Recovery</span>
          </div>
          <p>Use this when live sign-in is failing. Only configurations the server has recorded as previously live and known-good are listed. Drafts can&apos;t be rolled back to.</p>
        </div>
      </header>
      {candidates.length === 0 ? (
        <div className="au-rec-empty">
          <h3>No rollback target recorded</h3>
          <p className="muted">A configuration becomes a known-good target after another version replaces it. Until then, recover a failing binding with your organisation&apos;s break-glass procedure.</p>
        </div>
      ) : (
        <>
          <fieldset className="au-cands">
            <legend className="sr-only">Choose the exact rollback target</legend>
            {candidates.map((c) => {
              const chips = diffChips(active, c)
              return (
                <label key={c.connectionId} className={`au-cand${pick === c.connectionId ? ' on' : ''}`}>
                  <input type="radio" name="au-rollback" value={c.connectionId} checked={pick === c.connectionId} onChange={() => onPick(c.connectionId)} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <span className="au-ver sm">v{c.configurationVersion}</span>
                      <strong className="au-cand-name">{c.displayName}</strong>
                      {chips.map((x) => <span key={x} className="au-tag neutral">{x}</span>)}
                    </div>
                    <dl className="au-cand-kv">
                      <div><dt>Issuer</dt><dd className="mono">{c.issuerUri}</dd></div>
                      <div><dt>Browser client</dt><dd className="mono">{c.browserClientId}</dd></div>
                      <div><dt>Connection ID</dt><dd className="mono">{c.connectionId}</dd></div>
                      <div><dt>Last updated</dt><dd>{c.updatedAt ? fmtDateTime(c.updatedAt) : '—'}</dd></div>
                    </dl>
                  </div>
                </label>
              )
            })}
          </fieldset>
          <div className="au-rec-foot">
            <span className="faint">{selected ? `Selected v${selected.configurationVersion} · replaces live v${active.configurationVersion}` : 'Select one exact target to continue.'}</span>
            <button type="button" className="v-btn" disabled={!selected} onClick={() => selected && onReview(selected)}><RotateCcw size={15} aria-hidden />{selected ? `Review rollback to v${selected.configurationVersion}…` : 'Review rollback…'}</button>
          </div>
        </>
      )}
    </section>
  )
}

function NoBinding() {
  return (
    <section className="au-card">
      <Empty title="No live identity binding" icon={<Lock size={20} />}>
        The server reports no active enterprise identity connection for this tenant, so enterprise sign-in is unavailable. A configuration must be staged, tested and activated before users can sign in.
      </Empty>
    </section>
  )
}

/* ---------- Dialogs ---------- */

function ConfirmChange({ kind, from, to, maxAge, onClose, submit, onDone, onRetest, onRejected }: {
  kind: 'activate' | 'rollback'; from: IdentityConnection; to: IdentityConnection; maxAge: number; onClose: () => void
  submit: (k: 'activate' | 'rollback', t: IdentityConnection) => Promise<Rejection | null>; onDone: () => void; onRetest: () => void; onRejected: (r: Rejection) => void
}) {
  const word = kind === 'activate' ? 'ACTIVATE' : 'ROLLBACK'
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [rejected, setRejected] = useState<Rejection | null>(null)
  const inputId = useId()
  const changes = changedFields(from, to)
  const go = async () => {
    setBusy(true)
    const r = await submit(kind, to)
    setBusy(false)
    if (r) { setRejected(r); onRejected(r) } else onDone()
  }
  const title = kind === 'activate' ? `Activate v${to.configurationVersion}?` : `Roll back to v${to.configurationVersion}?`

  return (
    <Dialog title={title} onClose={busy ? () => undefined : onClose} footer={rejected ? (
      <>
        {rejected.retest && <button type="button" className="v-btn" onClick={onRetest}>Re-run connection test</button>}
        <button type="button" className="v-btn primary" onClick={onClose}>Close</button>
      </>
    ) : (
      <>
        <button type="button" className="v-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className={`v-btn ${kind === 'rollback' ? 'danger' : 'primary'}`} disabled={typed !== word || busy} onClick={go}>
          {busy ? <><Loader2 size={15} className="spin" aria-hidden />Submitting…</> : kind === 'activate' ? `Activate v${to.configurationVersion}` : `Roll back to v${to.configurationVersion}`}
        </button>
      </>
    )}>
      <div className="au-swap" aria-label={`From live v${from.configurationVersion} to v${to.configurationVersion}`}>
        <div className="au-swap-side"><span className="au-pill live"><span className="dot" aria-hidden />Live now</span><strong>v{from.configurationVersion}</strong><span className="muted">{from.displayName}</span></div>
        <ArrowRight size={18} className="faint" aria-hidden />
        <div className="au-swap-side"><span className={`au-pill ${kind === 'activate' ? 'draft' : 'rec'}`}>{kind === 'activate' ? 'Draft' : 'Known-good'}</span><strong>v{to.configurationVersion}</strong><span className="muted">{to.displayName}</span></div>
      </div>

      {changes.length > 0 ? (
        <div className="au-changes">
          <h3>What changes</h3>
          <ul>{changes.map((f) => (
            <li key={f.key}><span className="k">{f.label}</span><span className="mono old">{from[f.key]}</span><span className="mono new">{to[f.key]}</span></li>
          ))}</ul>
        </div>
      ) : <p className="muted">The settings match the live binding. The connection and version still change.</p>}

      <ul className="au-impact">
        <li>New sign-ins are validated against v{to.configurationVersion} (connection <span className="mono">{to.connectionId.slice(0, 8)}…</span>) as soon as the server accepts.</li>
        <li>Live v{from.configurationVersion} is kept as a known-good rollback target.</li>
        <li>If v{to.configurationVersion} rejects users, enterprise sign-in fails for the whole tenant until you roll back or use break-glass access.</li>
        {kind === 'activate' && to.lastTestedAt && <li>Last passing test: {fmtRel(to.lastTestedAt)}. The server accepts tests up to {windowLabel(maxAge)} old.</li>}
      </ul>

      {rejected ? (
        <Callout tone="bad" title={`Server refused · ${rejected.title}`}>
          {rejected.message} Nothing was changed. <span className="faint">(Simulated HTTP {rejected.code}.)</span>
        </Callout>
      ) : (
        <>
          <label className="v-field" htmlFor={inputId}>
            <span><span>Type <span className="mono au-word">{word}</span> to confirm</span></span>
            <input id={inputId} className="v-input mono" autoComplete="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={busy}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229 && typed === word && !busy) void go() }} />
            <small>Sent with the exact version v{to.configurationVersion}, as the server requires.</small>
          </label>
          <Callout tone="sim" title="Simulated operation">The server&apos;s response is set in Prototype controls. The SDV backend is not contacted.</Callout>
        </>
      )}
    </Dialog>
  )
}

function DraftEditor({ draft, isNew, onClose, onSave }: { draft: IdentityConnection; isNew: boolean; onClose: () => void; onSave: (d: IdentityConnection) => void }) {
  const [d, setD] = useState(draft)
  const issuerOk = /^https:\/\/[^\s]+$/.test(d.issuerUri.trim())
  const ok = issuerOk && d.displayName.trim() && d.browserClientId.trim() && d.apiAudience.trim()
  const dirty = FIELDS.some((f) => d[f.key] !== draft[f.key])
  const field = (key: FieldKey, label: string, hint?: ReactNode, invalid?: boolean) => (
    <label className="v-field">
      <span>{label}</span>
      <input className={`v-input${key === 'displayName' ? '' : ' mono'}${invalid ? ' invalid' : ''}`} value={d[key]} aria-invalid={invalid || undefined} spellCheck={false}
        onChange={(e) => setD({ ...d, [key]: e.target.value })} />
      {hint && <small style={invalid ? { color: 'var(--danger)' } : undefined}>{hint}</small>}
    </label>
  )
  return (
    <Drawer eyebrow={`Staged draft v${d.configurationVersion} · not live`} title={isNew ? 'Start draft from live' : 'Edit draft'} onClose={onClose}
      footer={<><button type="button" className="v-btn" onClick={onClose}>Cancel</button><button type="button" className="v-btn primary" disabled={!ok || (!isNew && !dirty)} onClick={() => onSave({ ...d, issuerUri: d.issuerUri.trim() })}>Save draft</button></>}>
      <Callout title="Saving does not change sign-in">The live binding stays in use. Saving clears any previous test result, so the saved version must be tested again.</Callout>
      {field('displayName', 'Display name')}
      <label className="v-field"><span>Provider ID</span><input className="v-input mono" value={d.providerId} readOnly /><small>Defaults to <span className="mono">customer-oidc</span>.</small></label>
      {field('issuerUri', 'Issuer URI', issuerOk ? 'HTTPS URL of the OIDC issuer.' : 'Enter an HTTPS URL with no spaces.', !issuerOk)}
      {field('browserClientId', 'Browser client ID', 'Public client used by the Vero web app. No secret is stored in SDV.')}
      {field('apiAudience', 'API audience', 'Audience the SDV API expects in access tokens.')}
    </Drawer>
  )
}

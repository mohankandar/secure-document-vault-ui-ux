import { useState } from 'react'
import { CheckCircle2, Circle, Pencil, Plus, RotateCcw } from 'lucide-react'
import { AREA_TABS, useStore } from './store'
import { SYSTEM, type IdentityConfig, type Volume } from './data'
import { AreaFrame } from './Governance'
import { AuthenticationTab } from './Authentication'
import { IntegrationsTab } from './Integrations'
import { Badge, Callout, Dialog, Drawer, Meter, Panel, Scenario, Status, fmtDate } from './ui'

const LEDE: Record<string, string> = {
  storage: 'Encrypted document volumes for this tenant, with warning and stop-write thresholds.',
  authentication: 'Which enterprise identity provider the server trusts for sign-in, how a staged change gets promoted, and how to recover.',
  integrations: 'Producer systems that submit documents, how they authenticate, and their metadata contract.',
  environment: 'Read-only facts about this customer environment.',
}

export const volumeAttention = (v: Volume) => v.error != null || v.usedPct >= v.warnPct && v.state === 'ACTIVE' || (v.state === 'ACTIVE' && (v.health !== 'UP' || !v.writable))

export function TenantAdmin() {
  const { route, volumes } = useStore()
  const tab = AREA_TABS.tenant.find((t) => t.id === route.tab)!
  return (
    <AreaFrame crumbs={['Tenant IT', tab.label]} title={tab.label} lede={LEDE[route.tab]} attention={volumes.some(volumeAttention) ? ['storage'] : []}>
      {route.tab === 'storage' && <StorageTab editable />}
      {route.tab === 'authentication' && <AuthenticationTab />}
      {route.tab === 'integrations' && <IntegrationsTab />}
      {route.tab === 'environment' && <EnvironmentPanel />}
    </AreaFrame>
  )
}

export function StorageTab({ editable }: { editable?: boolean }) {
  const { volumes, setVolumes, toast, recordAudit } = useStore()
  const [edit, setEdit] = useState<Volume | 'new' | null>(null)
  const attention = volumes.filter(volumeAttention)
  return (
    <>
      {attention.length > 0 && <Callout tone="warn" title={`${attention.length} volume needs attention`}>{attention.map((v) => `${v.name} is at ${v.usedPct}% (warning ${v.warnPct}%, stop-write ${v.stopPct}%).`).join(' ')} Add capacity or a new ACTIVE volume before stop-write is reached.</Callout>}
      <Panel flush title="Storage volumes" meta={volumes.length} actions={editable && <button type="button" className="v-btn sm primary" onClick={() => setEdit('new')}><Plus size={15} aria-hidden />Add volume</button>}>
        <Scenario what="storage volumes" empty={<Callout tone="warn" title="No storage volume configured">Add an ACTIVE volume before ingesting production documents.</Callout>}>
          <table className="v-table">
            <thead><tr><th>Volume</th><th>State</th><th>Health</th><th style={{ width: '28%' }}>Capacity</th><th className="num">Used</th>{editable && <th className="act"><span className="sr-only">Edit</span></th>}</tr></thead>
            <tbody>{volumes.map((v) => (
              <tr key={v.id}>
                <td className="lead" data-label="Volume"><div className="stack" style={{ gap: 0 }}><strong style={{ fontWeight: 500 }}>{v.name}</strong><span className="mono faint" style={{ fontSize: 12 }}>{v.path}</span></div></td>
                <td data-label="State"><Badge tone={v.state === 'ACTIVE' ? 'ok' : v.state === 'READ_ONLY' ? 'outline' : 'bad'}>{v.state.replace('_', '-').toLowerCase()}</Badge></td>
                <td data-label="Health"><Status value={v.health} label={`${v.health === 'UP' ? 'Healthy' : v.health}${v.writable ? '' : ' · read-only'}`} /></td>
                <td data-label="Capacity"><div style={{ width: '100%', maxWidth: 220, marginLeft: 'auto' }}><Meter pct={v.usedPct} warn={v.warnPct} stop={v.stopPct} label={`${v.name} capacity`} /></div></td>
                <td className="num" data-label="Used">{v.usedPct}% <span className="faint">of {(v.totalGb / 1024).toFixed(0)} TB</span></td>
                {editable && <td className="act"><button type="button" className="v-btn sm" onClick={() => setEdit(v)}><Pencil size={14} aria-hidden />Edit</button></td>}
              </tr>
            ))}</tbody>
          </table>
        </Scenario>
      </Panel>
      {edit && <VolumeDrawer volume={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSave={(v) => {
        setVolumes((list) => (list.some((x) => x.id === v.id) ? list.map((x) => (x.id === v.id ? v : x)) : [...list, v]))
        recordAudit({ action: edit === 'new' ? 'STORAGE_VOLUME_CREATED' : 'STORAGE_VOLUME_UPDATED', targetType: 'STORAGE_VOLUME', target: v.id, outcome: 'SUCCESS', details: { simulated: 'true' } })
        toast({ title: edit === 'new' ? 'Volume added (simulated)' : 'Volume updated (simulated)', detail: `${v.name} · ${v.state}` }); setEdit(null)
      }} />}
    </>
  )
}

function VolumeDrawer({ volume, onClose, onSave }: { volume: Volume | null; onClose: () => void; onSave: (v: Volume) => void }) {
  const [v, setV] = useState<Volume>(volume ?? { id: `vol-0${Math.floor(Math.random() * 9) + 3}`, name: '', path: '/mnt/sdv/', state: 'ACTIVE', health: 'UP', writable: true, usedPct: 0, totalGb: 2048, warnPct: 80, stopPct: 95, observedAt: new Date().toISOString(), error: null })
  const thresholdsOk = v.warnPct > 0 && v.warnPct < v.stopPct && v.stopPct <= 100
  const ok = v.name.trim() && v.path.startsWith('/') && thresholdsOk
  return (
    <Drawer eyebrow="Storage" title={volume ? `Edit ${volume.name}` : 'Add storage volume'} onClose={onClose} footer={<><button type="button" className="v-btn" onClick={onClose}>Cancel</button><button type="button" className="v-btn primary" disabled={!ok} onClick={() => onSave({ ...v, writable: v.state === 'ACTIVE' })}>{volume ? 'Save volume' : 'Add volume'}</button></>}>
      <label className="v-field"><span>Display name</span><input className="v-input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
      <label className="v-field"><span>Mount path</span><input className="v-input mono" value={v.path} readOnly={!!volume} onChange={(e) => setV({ ...v, path: e.target.value })} /><small>{volume ? 'Immutable after creation.' : 'Absolute path on the vault host.'}</small></label>
      <label className="v-field"><span>State</span><select className="v-select" value={v.state} onChange={(e) => setV({ ...v, state: e.target.value as Volume['state'] })}><option value="ACTIVE">Active — accepts new documents</option><option value="READ_ONLY">Read-only — serves existing documents</option><option value="DISABLED">Disabled</option></select></label>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <label className="v-field grow"><span>Warning at %</span><input className={`v-input${thresholdsOk ? '' : ' invalid'}`} inputMode="numeric" value={v.warnPct} onChange={(e) => setV({ ...v, warnPct: Number(e.target.value.replace(/\D/g, '')) })} /></label>
        <label className="v-field grow"><span>Stop-write at %</span><input className={`v-input${thresholdsOk ? '' : ' invalid'}`} inputMode="numeric" value={v.stopPct} onChange={(e) => setV({ ...v, stopPct: Number(e.target.value.replace(/\D/g, '')) })} /></label>
      </div>
      {!thresholdsOk && <small style={{ color: 'var(--danger)' }}>Warning must be lower than stop-write, and stop-write at most 100%.</small>}
      {volume && volume.state === 'ACTIVE' && v.state === 'DISABLED' && <Callout tone="bad" title="Disabling an active volume">Documents on this volume become unavailable until it is re-enabled.</Callout>}
    </Drawer>
  )
}

function AuthTab() {
  const { identity, setIdentity, toast, recordAudit, role } = useStore()
  const [test, setTest] = useState<'idle' | 'running' | 'passed'>('idle')
  const [editDraft, setEditDraft] = useState(false)
  const [activate, setActivate] = useState(false)
  const [rollback, setRollback] = useState<IdentityConfig | null>(null)
  const a = identity.active
  const d = identity.draft
  const runTest = () => { setTest('running'); window.setTimeout(() => { setTest('passed'); recordAudit({ action: 'IDENTITY_DRAFT_TESTED', targetType: 'IDENTITY_CONFIGURATION', target: `v${d?.version}`, outcome: 'SUCCESS', details: { simulated: 'true' } }) }, 1100) }
  const checks = ['Issuer discovery document reachable', 'Signing keys (JWKS) retrieved', 'Browser client accepted by issuer', 'Roles claim present in sample token']
  return (
    <>
      <Panel title="Active binding" meta={`v${a.version}`} description="LIVE · Trusted OIDC configuration used for sign-in right now. Saving or testing a draft does not change this binding." actions={<Status value="ACTIVE" label="Live" />}>
        <Scenario what="identity configuration">
          <dl className="v-kv cols">
            <div><dt>Provider</dt><dd>{a.name}</dd></div><div><dt>Type</dt><dd>{a.type}</dd></div>
            <div><dt>Issuer</dt><dd className="mono">{a.issuer}</dd></div><div><dt>Browser client</dt><dd className="mono">{a.clientId}</dd></div>
            <div><dt>API audience</dt><dd className="mono">{a.audience}</dd></div><div><dt>Roles claim</dt><dd className="mono">{a.rolesClaim}</dd></div>
            <div><dt>Last changed</dt><dd>{fmtDate(a.updatedAt)} · {a.updatedBy}</dd></div><div><dt>Client secret</dt><dd className="faint">Not stored in SDV</dd></div>
          </dl>
        </Scenario>
      </Panel>
      <Panel title="Staged configuration" description="DRAFT · NOT LIVE. Save, test, then activate the validated configuration. This prototype simulates identity operations."
        actions={d && <button type="button" className="v-btn sm" onClick={() => setEditDraft(true)}><Pencil size={14} aria-hidden />Edit draft</button>}>
        {!d ? (
          <div className="stack"><p className="muted">No draft in progress.</p><button type="button" className="v-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setIdentity((s) => ({ ...s, draft: { ...s.active, version: s.active.version + 1, updatedAt: new Date().toISOString(), updatedBy: role.person } }))}><Plus size={15} aria-hidden />Start draft from active</button></div>
        ) : (
          <div className="stack-lg">
            <dl className="v-kv cols">
              <div><dt>Provider</dt><dd>{d.name}</dd></div><div><dt>Draft version</dt><dd>v{d.version}</dd></div><div><dt>Issuer</dt><dd className="mono">{d.issuer}</dd></div><div><dt>Browser client</dt><dd className="mono">{d.clientId}{d.clientId !== a.clientId && <> <Badge tone="warn">changed</Badge></>}</dd></div><div><dt>API audience</dt><dd>{d.audience}</dd></div><div><dt>Connection test</dt><dd>{test === 'passed' ? 'Passed (simulated)' : test === 'running' ? 'Running (simulated)' : 'Not tested'}</dd></div>
              <div><dt>Roles claim</dt><dd className="mono">{d.rolesClaim}{d.rolesClaim !== a.rolesClaim && <> <Badge tone="warn">changed</Badge></>}</dd></div>
            </dl>
            <ol className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 8 }}>
              {checks.map((c, i) => (
                <li key={c} className="row" style={{ fontSize: 14 }}>
                  {test === 'passed' ? <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} aria-hidden /> : <Circle size={18} className="faint" aria-hidden style={test === 'running' ? { opacity: 0.4 + (i % 2) * 0.3 } : undefined} />}
                  <span className={test === 'passed' ? '' : 'muted'}>{c}</span>
                </li>
              ))}
            </ol>
            <div className="row wrap">
              <button type="button" className="v-btn" onClick={runTest} disabled={test === 'running'}>{test === 'running' ? 'Testing…' : test === 'passed' ? 'Re-run test' : 'Test draft'}</button>
              <button type="button" className="v-btn primary" disabled={test !== 'passed'} onClick={() => setActivate(true)}>Activate draft</button>
              {test !== 'passed' && <small className="faint">Activation is available after a passing test.</small>}
            </div>
            <Callout tone="sim" title="Simulated checks">No request is sent to the identity provider.</Callout>
          </div>
        )}
      </Panel>
      <Panel flush title="Known-good rollback" meta={identity.rollback.length} description="Previously active trusted configurations. In this prototype, rollback changes only local simulated state.">
        <Scenario what="rollback targets" empty={<p className="faint" style={{ padding: 16 }}>The previously active configuration will appear here after the first activation.</p>}>
          <table className="v-table">
            <thead><tr><th>Version</th><th>Provider</th><th>Client</th><th>Last active</th><th className="act"><span className="sr-only">Rollback</span></th></tr></thead>
            <tbody>{identity.rollback.map((r) => (
              <tr key={r.version}><td className="lead" data-label="Version"><strong style={{ fontWeight: 500 }}>v{r.version}</strong></td><td data-label="Provider">{r.name}</td><td data-label="Client"><span className="mono">{r.clientId}</span></td><td data-label="Last active">{fmtDate(r.updatedAt)}</td>
                <td className="act"><button type="button" className="v-btn sm" onClick={() => setRollback(r)}><RotateCcw size={14} aria-hidden />Roll back</button></td></tr>
            ))}</tbody>
          </table>
        </Scenario>
      </Panel>

      {editDraft && d && <DraftDrawer draft={d} onClose={() => setEditDraft(false)} onSave={(nd) => { setIdentity((s) => ({ ...s, draft: nd })); setTest('idle'); setEditDraft(false); toast({ title: 'Draft saved (simulated)', detail: 'Re-test before activating.' }) }} />}
      {activate && d && (
        <ConfirmIdentity title={`Activate v${d.version}?`} body="New sign-ins will use this configuration immediately. Existing sessions continue until they expire. The current version becomes a rollback target." cta="Activate" onClose={() => setActivate(false)}
          onConfirm={() => {
            setIdentity((s) => ({ active: { ...d, updatedAt: new Date().toISOString(), updatedBy: role.person }, draft: null, rollback: [s.active, ...s.rollback] }))
            recordAudit({ action: 'IDENTITY_CONFIGURATION_ACTIVATED', targetType: 'IDENTITY_CONFIGURATION', target: `v${d.version}`, outcome: 'SUCCESS', details: { simulated: 'true' } })
            toast({ title: `v${d.version} active (simulated)` }); setActivate(false); setTest('idle')
          }} />
      )}
      {rollback && (
        <ConfirmIdentity title={`Roll back to v${rollback.version}?`} body={`${rollback.name} with client ${rollback.clientId} becomes active for new sign-ins. Users missing the "${rollback.rolesClaim}" claim will be denied.`} cta="Roll back" onClose={() => setRollback(null)}
          onConfirm={() => {
            setIdentity((s) => ({ ...s, active: { ...rollback, updatedAt: new Date().toISOString(), updatedBy: role.person }, rollback: [s.active, ...s.rollback.filter((x) => x.version !== rollback.version)] }))
            recordAudit({ action: 'IDENTITY_CONFIGURATION_ROLLED_BACK', targetType: 'IDENTITY_CONFIGURATION', target: `v${rollback.version}`, outcome: 'SUCCESS', details: { simulated: 'true' } })
            toast({ title: `Rolled back to v${rollback.version} (simulated)` }); setRollback(null)
          }} />
      )}
    </>
  )
}

function ConfirmIdentity({ title, body, cta, onClose, onConfirm }: { title: string; body: string; cta: string; onClose: () => void; onConfirm: () => void }) {
  const [ack, setAck] = useState(false)
  return (
    <Dialog title={title} onClose={onClose} footer={<><button type="button" className="v-btn" onClick={onClose}>Cancel</button><button type="button" className="v-btn primary" disabled={!ack} onClick={onConfirm}>{cta}</button></>}>
      <Callout tone="warn" title="Affects sign-in for the whole tenant">{body}</Callout>
      <label className="v-check"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>I have a break-glass path if sign-in fails.</span></label>
    </Dialog>
  )
}

function DraftDrawer({ draft, onClose, onSave }: { draft: IdentityConfig; onClose: () => void; onSave: (d: IdentityConfig) => void }) {
  const [d, setD] = useState(draft)
  const ok = d.issuer.startsWith('https://') && d.clientId.trim() && d.audience.trim() && d.rolesClaim.trim()
  return (
    <Drawer eyebrow={`Identity draft v${d.version}`} title="Edit draft" onClose={onClose} footer={<><button type="button" className="v-btn" onClick={onClose}>Cancel</button><button type="button" className="v-btn primary" disabled={!ok} onClick={() => onSave(d)}>Save draft</button></>}>
      <label className="v-field"><span>Display name</span><input className="v-input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
      <label className="v-field"><span>Issuer URI</span><input className={`v-input mono${d.issuer.startsWith('https://') ? '' : ' invalid'}`} value={d.issuer} onChange={(e) => setD({ ...d, issuer: e.target.value })} /><small>Must be HTTPS.</small></label>
      <label className="v-field"><span>Browser client ID</span><input className="v-input mono" value={d.clientId} onChange={(e) => setD({ ...d, clientId: e.target.value })} /></label>
      <label className="v-field"><span>API audience</span><input className="v-input mono" value={d.audience} onChange={(e) => setD({ ...d, audience: e.target.value })} /></label>
      <label className="v-field"><span>Roles claim</span><input className="v-input mono" value={d.rolesClaim} onChange={(e) => setD({ ...d, rolesClaim: e.target.value })} /><small>Token claim containing SDV role codes.</small></label>
    </Drawer>
  )
}

export function EnvironmentPanel() {
  return (
    <Panel title="Customer environment" description="Settings apply only to this customer's SDV environment. Licensing and branding aren't editable yet.">
      <Scenario what="environment">
        <dl className="v-kv cols">
          <div><dt>Product</dt><dd>{SYSTEM.product}</dd></div><div><dt>Tenant</dt><dd>{SYSTEM.tenant}</dd></div>
          <div><dt>Environment</dt><dd>{SYSTEM.environment}</dd></div><div><dt>Region</dt><dd>{SYSTEM.region}</dd></div>
          <div><dt>Version</dt><dd className="mono">{SYSTEM.version}</dd></div><div><dt>Build</dt><dd className="mono">{SYSTEM.build}</dd></div>
          <div><dt>Active profiles</dt><dd className="row wrap" style={{ gap: 6 }}>{SYSTEM.profiles.map((p) => <Badge key={p} tone="outline">{p}</Badge>)}</dd></div><div><dt>Status</dt><dd><Status value="UP" label="Operational" /></dd></div>
        </dl>
      </Scenario>
    </Panel>
  )
}

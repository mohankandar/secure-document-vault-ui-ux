import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Building2, FileSearch, FlaskConical, Layers, Moon, Search, ServerCog, ShieldCheck, Sun, ExternalLink, CornerDownLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { AREA_TABS, StoreProvider, useStore, type Scenario } from './store'
import { ROLES, SYSTEM, FAILURES, STUCK, SUBMISSIONS, type AreaId } from './data'
import { Drawer, Seg, Toasts } from './ui'
import { Workspace } from './Workspace'
import { Governance } from './Governance'
import { TenantAdmin } from './TenantAdmin'
import { Operations } from './Operations'
import { DesignSystem } from './DesignSystem'

const AREA_META: Record<AreaId, { label: string; short: string; Icon: typeof Search; group: string }> = {
  workspace: { label: 'Records workspace', short: 'Records', Icon: FileSearch, group: 'Work' },
  governance: { label: 'Business administration', short: 'Governance', Icon: ShieldCheck, group: 'Administration' },
  tenant: { label: 'Tenant IT', short: 'Tenant IT', Icon: Building2, group: 'Administration' },
  operations: { label: 'Platform operations', short: 'Operations', Icon: ServerCog, group: 'Operations' },
  system: { label: 'Design system', short: 'System', Icon: Layers, group: 'Prototype' },
}

const incidentCount = FAILURES.length + STUCK.length + SUBMISSIONS.filter((s) => s.status === 'INCOMPLETE').length

function useMediaQuery(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}

function Rail({ collapsed, onToggle, onNavigated, onOpenSession }: { collapsed: boolean; onToggle: () => void; onNavigated: () => void; onOpenSession: () => void }) {
  const { role, route, navigate } = useStore()
  const go = (a: AreaId) => { navigate(a); onNavigated() }
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose
  return (
    <nav className="v-rail" id="primary-nav" aria-label="Primary" data-collapsed={collapsed}>
      <div className="v-rail-group">{AREA_META[role.areas[0]].group}</div>
      {role.areas.map((a) => {
        const { label, Icon } = AREA_META[a]
        const attention = a === 'operations' ? incidentCount : 0
        const name = attention > 0 ? `${label}, ${attention} need attention` : label
        return (
          <button key={a} type="button" className="v-rail-item" aria-current={route.area === a ? 'page' : undefined} onClick={() => go(a)} aria-label={name} data-tip={label}>
            <Icon size={20} aria-hidden /><span className="lbl" aria-hidden>{label}</span>
            {attention > 0 && <><span className="count" aria-hidden>{attention}</span><span className="v-rail-dot" aria-hidden /></>}
          </button>
        )
      })}
      <div className="v-rail-foot">
        <div className="v-rail-group">Prototype</div>
        <button type="button" className="v-rail-item" aria-current={route.area === 'system' ? 'page' : undefined} onClick={() => go('system')} aria-label="Design system" data-tip="Design system"><Layers size={20} aria-hidden /><span className="lbl" aria-hidden>Design system</span></button>
        <button type="button" className="v-rail-item" onClick={onOpenSession} aria-label="Session & scenarios" data-tip="Session & scenarios"><FlaskConical size={20} aria-hidden /><span className="lbl" aria-hidden>Session & scenarios</span></button>
        <button type="button" className="v-rail-item v-rail-toggle" onClick={onToggle} aria-expanded={!collapsed} aria-controls="primary-nav" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} data-tip="Expand navigation">
          <ToggleIcon size={20} aria-hidden /><span className="lbl" aria-hidden>Collapse</span><kbd className="v-rail-kbd" aria-hidden>[</kbd>
        </button>
      </div>
    </nav>
  )
}

function BottomNav({ onOpenSession, onOpenPalette }: { onOpenSession: () => void; onOpenPalette: () => void }) {
  const { role, route, navigate } = useStore()
  const area = role.areas[0]
  const { short, Icon } = AREA_META[area]
  return (
    <nav className="v-bottom" aria-label="Primary">
      <button type="button" aria-current={route.area === area ? 'page' : undefined} onClick={() => navigate(area)}><Icon size={22} aria-hidden />{short}</button>
      <button type="button" onClick={onOpenPalette}><Search size={22} aria-hidden />Find</button>
      <button type="button" aria-current={route.area === 'system' ? 'page' : undefined} onClick={() => navigate('system')}><Layers size={22} aria-hidden />System</button>
      <button type="button" onClick={onOpenSession}><FlaskConical size={22} aria-hidden />Session</button>
    </nav>
  )
}

function SessionDrawer({ onClose }: { onClose: () => void }) {
  const { roleId, switchRole, scenario, setScenario, theme, setTheme } = useStore()
  return (
    <Drawer eyebrow="Prototype session" title="Explore as a role" onClose={onClose} footer={<button type="button" className="v-btn primary" onClick={onClose}>Done</button>}>
      <div className="stack" role="radiogroup" aria-label="Role">
        <span className="v-label">Signed in as</span>
        {ROLES.map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={r.id === roleId} className="v-menu-item" style={{ border: '1px solid var(--line)' }} onClick={() => { switchRole(r.id); onClose() }}>
            <span className="v-avatar" aria-hidden>{r.initials}</span>
            <span className="grow"><strong style={{ fontWeight: 500 }}>{r.name}</strong><small>{r.person} · <span className="mono">{r.code}</span></small></span>
          </button>
        ))}
      </div>
      <div className="stack">
        <span className="v-label">Data scenario</span>
        <Seg<Scenario> label="Data scenario" value={scenario} onChange={setScenario} options={[{ value: 'live', label: 'Populated' }, { value: 'loading', label: 'Loading' }, { value: 'empty', label: 'Empty' }, { value: 'error', label: 'Error' }]} />
        <small className="faint">Applies to every data panel so you can review each state on every screen.</small>
      </div>
      <div className="stack">
        <span className="v-label">Theme</span>
        <Seg label="Theme" value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </div>
      <div className="v-callout sim">
        <FlaskConical size={18} aria-hidden />
        <div><strong>Everything here is simulated</strong><p>Sample data only. No request reaches an SDV backend, and no document, policy or configuration is changed. Actions marked “Simulated” are recorded only in this browser tab and reset on reload.</p></div>
      </div>
      <a className="v-btn" href="?app=r5">Open approved R5 application<ExternalLink size={14} aria-hidden /></a>
    </Drawer>
  )
}

function Palette({ onClose }: { onClose: () => void }) {
  const { role, navigate, records, can, setSelectedRef } = useStore()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const items = useMemo(() => {
    const dest = [...role.areas, 'system' as AreaId].flatMap((a) => AREA_TABS[a].map((t) => ({ key: `${a}/${t.id}`, label: t.label, hint: AREA_META[a].label, run: () => navigate(a, t.id) })))
    const recs = can('SEARCH_RECORDS') ? records.map((r) => ({ key: r.ref, label: `${r.identifiers[0].value} · ${r.title}`, hint: 'Record', run: () => { navigate('workspace'); setSelectedRef(r.ref) } })) : []
    const needle = q.trim().toLowerCase()
    return [...dest, ...recs].filter((i) => !needle || `${i.label} ${i.hint}`.toLowerCase().includes(needle)).slice(0, 12)
  }, [q, role.areas, records, can, navigate, setSelectedRef])
  const run = (i: number) => { items[i]?.run(); onClose() }
  return (
    <>
      <div className="v-scrim v-dialog-scrim" onClick={onClose} aria-hidden />
      <div className="v-palette" role="dialog" aria-modal="true" aria-label="Go to">
        <input autoFocus value={q} placeholder={can('SEARCH_RECORDS') ? 'Jump to a page or record number…' : 'Jump to a page…'} aria-label="Search destinations"
          onChange={(e) => { setQ(e.target.value); setActive(0) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) run(active)
          }} />
        <ul>
          {items.length === 0 && <li className="faint" style={{ padding: 16 }}>No matches</li>}
          {items.map((i, idx) => (
            <li key={i.key}><button type="button" data-active={idx === active} onMouseEnter={() => setActive(idx)} onClick={() => run(idx)}>
              <span className="grow truncate">{i.label}</span><span className="faint" style={{ fontSize: 13 }}>{i.hint}</span>{idx === active && <CornerDownLeft size={14} aria-hidden />}
            </button></li>
          ))}
        </ul>
      </div>
    </>
  )
}

function ShellInner() {
  const { role, route, theme, setTheme, navPref, setNavPref, resultsShown } = useStore()
  const [session, setSession] = useState(false)
  const [palette, setPalette] = useState(false)
  const docked = useMediaQuery('(min-width: 1280px)')
  const [peek, setPeek] = useState(false)

  // Docked (≥1280px) the rail pushes content and follows navPref. Below that it stays an icon rail and
  // expanding is a temporary overlay, so the workspace never reflows on tablet widths.
  const autoCollapsed = route.area === 'workspace' && resultsShown
  const dockedCollapsed = navPref === 'auto' ? autoCollapsed : navPref === 'collapsed'
  const collapsed = docked ? dockedCollapsed : !peek
  const overlay = !docked && peek
  const toggleNav = () => { if (docked) setNavPref(dockedCollapsed ? 'expanded' : 'collapsed'); else setPeek((p) => !p) }

  useEffect(() => { if (docked) setPeek(false) }, [docked])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); return }
      if (e.key === 'Escape') setPeek(false)
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      if (e.key === '[' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); toggleRef.current() }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  const toggleRef = useRef(toggleNav)
  toggleRef.current = toggleNav

  const allowed = route.area === 'system' || role.areas.includes(route.area)
  return (
    <div className="r7">
      <div className="v-app" data-nav={docked ? (collapsed ? 'collapsed' : 'expanded') : overlay ? 'overlay' : 'rail'}>
        <header className="v-top">
          <a className="v-brand" href="#/" aria-label="vero home" onClick={(e) => { e.preventDefault() }}>vero<i aria-hidden /></a>
          <div className="v-tenant"><strong>{SYSTEM.tenant}</strong><span>{SYSTEM.environment} · {SYSTEM.region}</span></div>
          <div className="grow" />
          <button type="button" className="v-command" onClick={() => setPalette(true)} aria-label="Go to page or record"><Search size={16} aria-hidden /><span>Go to…</span><kbd>⌘K</kbd></button>
          <span className="v-sim-chip" title="Simulated data — no backend calls"><FlaskConical size={13} aria-hidden /><span className="long">Prototype · simulated data</span><span className="short">Simulated</span></span>
          <button type="button" className="v-btn quiet icon vw-hide-sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button type="button" className="v-me" onClick={() => setSession(true)} aria-label={`Signed in as ${role.person}, ${role.name}. Change role`}>
            <span className="v-avatar" aria-hidden>{role.initials}</span>
            <span className="who"><strong>{role.person}</strong><span>{role.name}</span></span>
          </button>
        </header>
        <Rail collapsed={collapsed} onToggle={toggleNav} onNavigated={() => setPeek(false)} onOpenSession={() => { setPeek(false); setSession(true) }} />
        {overlay && <div className="v-rail-scrim" onClick={() => setPeek(false)} aria-hidden />}
        <main className="v-main" id="main">
          {!allowed ? <AccessBoundary /> :
            route.area === 'workspace' ? <Workspace /> :
            route.area === 'governance' ? <Governance /> :
            route.area === 'tenant' ? <TenantAdmin /> :
            route.area === 'operations' ? <Operations /> : <DesignSystem />}
        </main>
        <BottomNav onOpenSession={() => setSession(true)} onOpenPalette={() => setPalette(true)} />
      </div>
      {session && <SessionDrawer onClose={() => setSession(false)} />}
      {palette && <Palette onClose={() => setPalette(false)} />}
      <Toasts />
    </div>
  )
}

function AccessBoundary() {
  const { role, navigate } = useStore()
  return (
    <div className="v-body" style={{ maxWidth: 560, margin: '10vh auto' }}>
      <div className="v-panel"><div className="v-panel-body stack">
        <Activity size={22} aria-hidden className="faint" />
        <h1>This area isn&apos;t assigned to your role</h1>
        <p className="muted">{role.name} can&apos;t open this area. Access is decided by roles in your identity provider and enforced by the server; the interface only reflects it.</p>
        <button type="button" className="v-btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(role.areas[0])}>Go to {AREA_META[role.areas[0]].label}</button>
      </div></div>
    </div>
  )
}

export function R7App() {
  return <StoreProvider><ShellInner /></StoreProvider>
}
export { AREA_META }

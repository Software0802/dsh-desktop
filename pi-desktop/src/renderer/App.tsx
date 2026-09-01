import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  AISKILL_MARKET_URL,
  starterMarketItems,
  type MarketItem,
  type PiRpcEvent,
  type PiStatus,
} from '../shared/types.js'

type View = 'chat' | 'market' | 'settings'
type Message = { readonly id: string; readonly role: 'user' | 'assistant'; readonly text: string }

const initialMessages: readonly Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Pi is ready to work with you. Ask for a change, a review, or a plan for the next step.',
  },
]

function Glyph({ name, size = 17 }: { readonly name: string; readonly size?: number }) {
  const paths: Record<string, ReactNode> = {
    plus: <path d="M8 3v10M3 8h10" />,
    chat: <path d="M3 3.5h10v7H7l-3.5 2v-2H3z" />,
    box: <path d="m8 2 5 2.5v7L8 14l-5-2.5v-7zM3 4.5 8 7l5-2.5M8 7v7" />,
    search: <><circle cx="7" cy="7" r="4" /><path d="m10 10 3 3" /></>,
    settings: <><circle cx="8" cy="8" r="2.3" /><path d="M8 2v1.2M8 12.8V14M2 8h1.2M12.8 8H14M3.8 3.8l.85.85M11.35 11.35l.85.85M12.2 3.8l-.85.85M4.65 11.35l-.85.85" /></>,
    panel: <path d="M3 3h10v10H3zM5.5 3v10" />,
    send: <path d="m3 3 10 5-10 5 2-5zM5 8h8" />,
    chevron: <path d="m5 6 3 3 3-3" />,
    dots: <><circle cx="4" cy="8" r=".7" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r=".7" fill="currentColor" stroke="none" /><circle cx="12" cy="8" r=".7" fill="currentColor" stroke="none" /></>,
    external: <><path d="M9 3h4v4M13 3 7.5 8.5" /><path d="M11 8v3.5h-6v-6H8" /></>,
    close: <path d="m4 4 8 8M12 4l-8 8" />,
    bolt: <path d="m9 2-5 7h3l-1 5 5-7H8z" />,
    folder: <path d="M2.5 4.5h4l1.2 1.4h5.8v6.6h-11z" />,
  }
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function Logo({ compact = false }: { readonly compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-mark"><Glyph name="bolt" size={18} /></span>
      {!compact && <span className="brand-copy"><strong>Pi</strong><small>DESKTOP</small></span>}
    </div>
  )
}

function StatusPill({ status }: { readonly status: PiStatus }) {
  const label = status.state === 'ready' ? 'Pi connected' : status.state === 'starting' ? 'Starting Pi' : status.state === 'error' ? 'Pi unavailable' : 'Offline preview'
  return <span className={`status-pill status-${status.state}`}><span className="status-dot" />{label}</span>
}

function Sidebar({ view, setView, onNewSession }: { readonly view: View; readonly setView: (view: View) => void; readonly onNewSession: () => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Logo />
        <button className="icon-button" type="button" aria-label="Collapse sidebar"><Glyph name="panel" /></button>
      </div>
      <button className="new-session" type="button" onClick={onNewSession}><Glyph name="plus" size={15} /><span>New session</span><kbd>Ctrl N</kbd></button>
      <div className="sidebar-section-label">Workspace</div>
      <nav className="session-list" aria-label="Sessions">
        <button className="session-item active" type="button" onClick={() => setView('chat')}>
          <span className="session-icon"><Glyph name="chat" size={15} /></span>
          <span className="session-text"><strong>Getting started</strong><small>Just now</small></span>
          <Glyph name="dots" size={16} />
        </button>
        <button className="session-item" type="button" onClick={() => setView('chat')}>
          <span className="session-icon session-icon-muted"><Glyph name="chat" size={15} /></span>
          <span className="session-text"><strong>Self-improving loop</strong><small>Yesterday</small></span>
        </button>
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-footer">
        <button className={`footer-action ${view === 'market' ? 'selected' : ''}`} type="button" onClick={() => setView('market')}><span className="market-icon"><Glyph name="box" size={16} /></span><span>Plugin market</span><span className="market-count">4</span></button>
        <button className={`footer-action ${view === 'settings' ? 'selected' : ''}`} type="button" onClick={() => setView('settings')}><Glyph name="settings" size={16} /><span>Settings</span></button>
      </div>
    </aside>
  )
}

function Conversation({ messages, running, draft, setDraft, onSubmit, onOpenMarket }: {
  readonly messages: readonly Message[]
  readonly running: boolean
  readonly draft: string
  readonly setDraft: (value: string) => void
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void
  readonly onOpenMarket: () => void
}) {
  return (
    <main className="conversation">
      <header className="conversation-header">
        <div className="conversation-title"><span className="live-mark" /><strong>Getting started</strong><button className="title-chevron" type="button" aria-label="Session options"><Glyph name="chevron" size={14} /></button></div>
        <div className="header-actions"><span className="model-label"><span className="model-dot" />Pi / default</span><button className="icon-button" type="button" aria-label="More session actions"><Glyph name="dots" /></button></div>
      </header>
      <div className="conversation-scroll">
        <section className="conversation-content">
          <div className="conversation-intro"><span className="intro-kicker">PI DESKTOP / 01</span><h1>A better surface for<br /><em>agentic work.</em></h1><p>Use Pi as the kernel. Bring your skills, plugins, and workflow into one quiet workspace.</p></div>
          <div className="message-list">
            {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            {running && <div className="thinking-row"><span className="thinking-icon"><Glyph name="bolt" size={14} /></span><span>Pi is thinking<span className="thinking-dots">...</span></span></div>}
          </div>
          <div className="suggestion-row"><button type="button" onClick={() => setDraft('Review the current project and suggest the next safe improvement.')}>Review this project <span>R</span></button><button type="button" onClick={onOpenMarket}>Browse plugins <span><Glyph name="external" size={12} /></span></button></div>
        </section>
      </div>
      <form className="composer-wrap" onSubmit={onSubmit}>
        <div className="composer">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask Pi to do something..." rows={1} aria-label="Message Pi" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} />
          <div className="composer-bottom"><div className="composer-tools"><button type="button" className="composer-tool" aria-label="Attach files"><Glyph name="folder" size={15} /></button><span>Shift + Enter for a new line</span></div><button className="send-button" type="submit" disabled={running || draft.trim() === ''} aria-label="Send message"><Glyph name="send" size={16} /></button></div>
        </div>
        <div className="composer-note">Pi can make changes to your workspace. Review tool actions before they run.</div>
      </form>
    </main>
  )
}

function MessageBubble({ message }: { readonly message: Message }) {
  return <article className={`message message-${message.role}`}><div className="message-avatar">{message.role === 'assistant' ? <Glyph name="bolt" size={14} /> : 'Y'}</div><div className="message-body"><div className="message-meta"><strong>{message.role === 'assistant' ? 'Pi' : 'You'}</strong><span>{message.role === 'assistant' ? 'Assistant' : 'Just now'}</span></div><p>{message.text}</p></div></article>
}

function DetailsPanel({ status }: { readonly status: PiStatus }) {
  return <aside className="details-panel"><div className="details-heading"><span>Session details</span><button className="icon-button" type="button" aria-label="Close details"><Glyph name="close" size={15} /></button></div><div className="details-card"><div className="detail-card-head"><span className="detail-icon"><Glyph name="bolt" size={15} /></span><div><strong>Pi runtime</strong><small>Primary agent kernel</small></div></div><StatusPill status={status} /><div className="detail-row"><span>Provider</span><strong>Configured locally</strong></div><div className="detail-row"><span>Workspace</span><strong className="detail-path">Current folder</strong></div></div><div className="details-section"><div className="details-section-title"><span>Loaded plugins</span><span className="section-count">1</span></div><div className="loaded-plugin"><span className="plugin-mini-icon"><Glyph name="box" size={14} /></span><span><strong>Code Review</strong><small>Skill / native</small></span><span className="loaded-dot" /></div></div><div className="details-section details-note"><div className="details-section-title"><span>Compatibility</span></div><p>Pi extensions load natively. DSH UI plugins will run through the compatibility adapter when enabled.</p><button className="text-button" type="button">Read the plugin guide <Glyph name="external" size={12} /></button></div></aside>
}

function MarketView({ onClose }: { readonly onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'installed'>('all')
  const [installed, setInstalled] = useState(() => new Set(starterMarketItems.filter((item) => item.installed).map((item) => item.id)))
  const items = useMemo(() => starterMarketItems.filter((item) => (filter === 'all' || installed.has(item.id)) && `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [filter, installed, query])
  const toggleInstall = (item: MarketItem): void => {
    setInstalled((current) => {
      const next = new Set(current)
      if (next.has(item.id)) next.delete(item.id)
      else next.add(item.id)
      return next
    })
  }
  const openMarket = (): void => { void window.pi?.openExternal(AISKILL_MARKET_URL) }
  return <div className="overlay" role="dialog" aria-modal="true" aria-label="Plugin market"><button className="overlay-mask" type="button" aria-label="Close plugin market" onClick={onClose} /><section className="market-panel"><header className="market-header"><div><span className="intro-kicker">EXTEND PI</span><h1>Plugin market</h1><p>Skills, workflows, and compatible UI extensions for your agent workspace.</p></div><button className="icon-button" type="button" aria-label="Close plugin market" onClick={onClose}><Glyph name="close" /></button></header><div className="market-toolbar"><div className="market-tabs"><button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>Discover</button><button className={filter === 'installed' ? 'active' : ''} type="button" onClick={() => setFilter('installed')}>Installed <span>{installed.size}</span></button></div><label className="search-field"><Glyph name="search" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plugins" aria-label="Search plugins" /></label></div><div className="market-source"><span className="source-check"><Glyph name="bolt" size={13} /></span><span>Connected to <strong>aiskill.market</strong> for Skills and agent workflows.</span><button type="button" onClick={openMarket}>Open catalog <Glyph name="external" size={12} /></button></div><div className="market-grid">{items.map((item) => <MarketCard key={item.id} item={item} installed={installed.has(item.id)} onToggle={() => toggleInstall(item)} />)}</div>{items.length === 0 && <div className="empty-market"><Glyph name="search" size={22} /><strong>No plugins found</strong><span>Try a different search or browse the online catalog.</span></div>}</section></div>
}

function MarketCard({ item, installed, onToggle }: { readonly item: MarketItem; readonly installed: boolean; readonly onToggle: () => void }) {
  return <article className="market-card"><div className="market-card-top"><span className={`market-glyph kind-${item.kind}`}><Glyph name={item.kind === 'skill' ? 'bolt' : item.kind === 'dsh-ui' ? 'panel' : 'box'} size={18} /></span><div className="market-card-title"><strong>{item.name}</strong><small>{item.kind === 'dsh-ui' ? 'DSH UI plugin' : `${item.kind[0].toUpperCase()}${item.kind.slice(1)} / ${item.source}`}</small></div>{item.featured && <span className="featured">Featured</span>}</div><p>{item.description}</p><div className="market-card-bottom"><span className={`compatibility compatibility-${item.compatibility}`}>{item.compatibility === 'native' ? 'Pi native' : item.compatibility === 'adapter' ? 'Adapter' : 'Isolated host'}</span><button className={installed ? 'installed-button' : 'install-button'} type="button" onClick={onToggle}>{installed ? 'Installed' : 'Install'}</button></div></article>
}

function SettingsView({ status }: { readonly status: PiStatus }) {
  return <section className="settings-view"><div className="settings-heading"><span className="intro-kicker">CONFIGURATION</span><h1>Settings</h1><p>Keep the desktop surface simple. Runtime choices stay explicit and local.</p></div><div className="settings-list"><div className="setting-row"><div><strong>Pi executable</strong><p>Uses <code>PI_DESKTOP_PI_BIN</code>, or resolves <code>pi</code> from PATH.</p></div><span className="setting-value">Auto</span></div><div className="setting-row"><div><strong>Agent mode</strong><p>Prompts are sent over Pi's JSONL RPC protocol.</p></div><span className="setting-value">RPC</span></div><div className="setting-row"><div><strong>Runtime status</strong><p>{status.detail ?? 'No Pi process has been started yet.'}</p></div><StatusPill status={status} /></div></div></section>
}

export function App() {
  const [view, setView] = useState<View>('chat')
  const [marketOpen, setMarketOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<PiStatus>({ state: 'offline' })
  const [messages, setMessages] = useState<readonly Message[]>(initialMessages)

  useEffect(() => {
    if (window.pi === undefined) return
    void window.pi.getStatus().then(setStatus)
    return window.pi.onEvent((event) => handlePiEvent(event, setMessages, setRunning, setStatus))
  }, [])

  const newSession = (): void => {
    setView('chat')
    setMessages(initialMessages)
    setDraft('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const text = draft.trim()
    if (text === '' || running) return
    setDraft('')
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text }])
    setRunning(true)
    if (window.pi === undefined) {
      setMessages((current) => [...current, { id: `offline-${Date.now()}`, role: 'assistant', text: 'Preview mode is active. Launch the Electron app and configure Pi to send a live prompt.' }])
      setRunning(false)
      return
    }
    const result = await window.pi.prompt(text)
    setStatus(await window.pi.getStatus())
    if (!result.accepted) {
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: 'assistant', text: result.error ?? 'Pi rejected the prompt.' }])
      setRunning(false)
    }
  }

  return <div className="app-shell"><Sidebar view={view} setView={setView} onNewSession={newSession} />{view === 'chat' && <Conversation messages={messages} running={running} draft={draft} setDraft={setDraft} onSubmit={submit} onOpenMarket={() => setMarketOpen(true)} />}{view === 'settings' && <SettingsView status={status} />}{view === 'market' && <MarketView onClose={() => setView('chat')} />}<DetailsPanel status={status} />{marketOpen && <MarketView onClose={() => setMarketOpen(false)} />}</div>
}

function handlePiEvent(event: PiRpcEvent, setMessages: (update: (current: readonly Message[]) => readonly Message[]) => void, setRunning: (value: boolean) => void, setStatus: (status: PiStatus) => void): void {
  if (event.type === 'agent_start') { setRunning(true); setStatus({ state: 'ready' }); return }
  if (event.type === 'agent_end' || event.type === 'agent_settled') { setRunning(false); return }
  if (event.type !== 'message_update') return
  const delta = event.assistantMessageEvent
  if (delta === null || typeof delta !== 'object') return
  const typedDelta = delta as { readonly type?: unknown; readonly delta?: unknown }
  const deltaText = typedDelta.delta
  if (typedDelta.type !== 'text_delta' || typeof deltaText !== 'string') return
  setMessages((current) => {
    const last = current[current.length - 1]
    if (last?.role === 'assistant' && last.id === 'streaming') return [...current.slice(0, -1), { ...last, text: last.text + deltaText }]
    return [...current, { id: 'streaming', role: 'assistant', text: deltaText }]
  })
}

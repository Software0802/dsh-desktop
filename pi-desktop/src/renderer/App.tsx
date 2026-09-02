import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AISKILL_MARKET_URL,
  starterMarketItems,
  type MarketItem,
  type PiRpcEvent,
  type PiStatus,
} from '../shared/types.js'
import {
  BrandWordmark,
  FishLogo,
  IconArrowUp,
  IconCheck,
  IconCopy,
  IconDownload,
  IconExternal,
  IconFilter,
  IconFolder,
  IconFolderPlus,
  IconGrid,
  IconPanelLeft,
  IconPlus,
  IconPlusCircle,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconShield,
  IconThumbsDown,
  IconThumbsUp,
  IconTrash,
  IconX,
} from './icons.js'

type Overlay = 'market' | 'settings' | null
type ChatTab = 'chat' | 'trajectory'
type Message = { readonly id: string; readonly role: 'user' | 'assistant'; readonly text: string }
type Session = {
  readonly id: string
  readonly title: string
  readonly messages: readonly Message[]
  readonly updatedAt: number
}

const WORKSPACE = 'dsh'

function newSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`
}

function emptySession(): Session {
  return { id: newSessionId(), title: '新会话', messages: [], updatedAt: Date.now() }
}

function statusLabel(status: PiStatus): string {
  if (status.state === 'ready') return 'Pi 已连接'
  if (status.state === 'starting') return '正在启动 Pi'
  if (status.state === 'error') return 'Pi 不可用'
  return '离线预览'
}

function timeLabel(updatedAt: number): string {
  const delta = Date.now() - updatedAt
  if (delta < 60_000) return '刚刚'
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`
  return '今天'
}

function titleFromPrompt(text: string): string {
  const line = text.trim().split('\n')[0] ?? '新会话'
  return line.length > 18 ? `${line.slice(0, 18)}…` : line
}

export function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [tab, setTab] = useState<ChatTab>('chat')
  const [draft, setDraft] = useState('')
  const [running, setRunning] = useState(false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [status, setStatus] = useState<PiStatus>({ state: 'offline' })
  const [seed] = useState(emptySession)
  const [sessions, setSessions] = useState<readonly Session[]>([seed])
  const [activeId, setActiveId] = useState(seed.id)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [liked, setLiked] = useState<Readonly<Record<string, 'up' | 'down'>>>({})

  const active = sessions.find((session) => session.id === activeId) ?? sessions[0]
  const messages = active?.messages ?? []
  const isHero = messages.length === 0

  useEffect(() => {
    if (window.pi === undefined) return
    void window.pi.getStatus().then(setStatus)
    return window.pi.onEvent((event) => handlePiEvent(event, setSessions, activeId, setRunning, setStatus))
  }, [activeId])

  const visibleSessions = useMemo(
    () => sessions.filter((session) => session.title.toLowerCase().includes(query.trim().toLowerCase())),
    [query, sessions],
  )

  const createSession = (): void => {
    const session = emptySession()
    setSessions((current) => [session, ...current])
    setActiveId(session.id)
    setDraft('')
    setTab('chat')
    setOverlay(null)
  }

  const selectSession = (id: string): void => {
    setActiveId(id)
    setTab('chat')
    setOverlay(null)
  }

  const removeSession = (id: string): void => {
    setSessions((current) => {
      const next = current.filter((session) => session.id !== id)
      const fallback = next[0] ?? emptySession()
      if (next.length === 0) {
        setActiveId(fallback.id)
        return [fallback]
      }
      if (id === activeId) setActiveId(fallback.id)
      return next
    })
  }

  const patchActive = (update: (session: Session) => Session): void => {
    setSessions((current) => current.map((session) => (session.id === activeId ? update(session) : session)))
  }

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const text = draft.trim()
    if (text === '' || running || active === undefined) return
    setDraft('')
    setTab('chat')
    patchActive((session) => ({
      ...session,
      title: session.messages.length === 0 ? titleFromPrompt(text) : session.title,
      messages: [...session.messages, { id: `user-${Date.now()}`, role: 'user', text }],
      updatedAt: Date.now(),
    }))
    setRunning(true)
    if (window.pi === undefined) {
      patchActive((session) => ({
        ...session,
        messages: [...session.messages, {
          id: `offline-${Date.now()}`,
          role: 'assistant',
          text: '当前是预览模式。启动 Electron 应用并配置 Pi 后即可发送真实请求。',
        }],
        updatedAt: Date.now(),
      }))
      setRunning(false)
      return
    }
    const result = await window.pi.prompt(text)
    setStatus(await window.pi.getStatus())
    if (!result.accepted) {
      patchActive((session) => ({
        ...session,
        messages: [...session.messages, { id: `error-${Date.now()}`, role: 'assistant', text: result.error ?? 'Pi 拒绝了这次请求。' }],
        updatedAt: Date.now(),
      }))
      setRunning(false)
    }
  }

  const copyMessage = async (message: Message): Promise<void> => {
    try {
      await navigator.clipboard.writeText(message.text)
      setCopiedId(message.id)
      window.setTimeout(() => setCopiedId(null), 1200)
    } catch {
      setCopiedId(null)
    }
  }

  const regenerate = (): void => {
    const lastUser = [...messages].reverse().find((message) => message.role === 'user')
    if (lastUser === undefined || running) return
    setDraft(lastUser.text)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="logo-row">
          <button className="brand" type="button" onClick={createSession} aria-label="deepseek">
            {collapsed ? <FishLogo size={24} /> : <BrandWordmark size={18} />}
          </button>
          <button className="icon-button toggle" type="button" aria-label={collapsed ? '展开侧栏' : '收起侧栏'} onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? <FishLogo size={22} /> : <IconPanelLeft size={16} />}
          </button>
        </div>
        <button className="new-session" type="button" onClick={createSession}>
          <IconPlusCircle size={16} />
          <span className="new-session-label">新会话</span>
        </button>
        <div className="workspace-area">
          <div className="section-header">
            <span className="section-label">工作区</span>
            {searchOpen ? (
              <input
                className="workspace-search open"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索会话"
                aria-label="搜索会话"
                autoFocus
                onBlur={() => { if (query.trim() === '') setSearchOpen(false) }}
              />
            ) : (
              <button className="icon-button" type="button" aria-label="搜索" onClick={() => setSearchOpen(true)}><IconSearch size={16} /></button>
            )}
            <button className="icon-button" type="button" aria-label="筛选"><IconFilter size={16} /></button>
            <button className="icon-button" type="button" aria-label="新建文件夹"><IconFolderPlus size={16} /></button>
          </div>
          <div className="tree">
            <div className="project-row">
              <span className="folder-icon active"><IconFolder size={16} /></span>
              <span className="row-title">{WORKSPACE}</span>
            </div>
            {visibleSessions.map((session) => (
              <div
                key={session.id}
                className={`session-row ${session.id === activeId ? 'selected' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => selectSession(session.id)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectSession(session.id) } }}
              >
                <span className="row-title">{session.title}</span>
                <span className="row-time">{timeLabel(session.updatedAt)}</span>
                <button
                  className="icon-button row-delete"
                  type="button"
                  aria-label="删除会话"
                  onClick={(event) => { event.stopPropagation(); removeSession(session.id) }}
                >
                  <IconTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="foot-area">
          <button className={`foot-action ${overlay === 'market' ? 'selected' : ''}`} type="button" onClick={() => setOverlay('market')}>
            <IconGrid size={16} /><span>插件市场</span>
          </button>
          <button className={`foot-action ${overlay === 'settings' ? 'selected' : ''}`} type="button" onClick={() => setOverlay('settings')}>
            <IconSettings size={16} /><span>设置</span>
          </button>
        </div>
      </aside>

      <main className="conversation">
        {!isHero && (
          <header className="conv-header">
            <div className="title-row">
              <span className="session-title">{active?.title ?? '新会话'}</span>
              <span className="mode-chip">标准模式</span>
              <div className="header-actions">
                <button className="icon-button" type="button" aria-label="导出会话"><IconDownload size={16} /></button>
              </div>
            </div>
            <div className="tabs">
              <button className={`tab ${tab === 'chat' ? 'active' : ''}`} type="button" onClick={() => setTab('chat')}>对话</button>
              <button className={`tab ${tab === 'trajectory' ? 'active' : ''}`} type="button" onClick={() => setTab('trajectory')}>轨迹</button>
            </div>
          </header>
        )}

        <div className={`conv-body`}>
          <div className={`scroll-body ${isHero ? 'hero-phase' : ''}`}>
            {isHero ? (
              <div className="hero">
                <div className="hero-stack">
                  <div className="headline">
                    <span className="fish-hitbox"><FishLogo className="hero-fish" size={34} /></span>
                    <span>探索未至之境</span>
                    <span className="preview-badge">预览版</span>
                  </div>
                  <div className="hero-chips">
                    <button className="chip" type="button"><IconFolder size={14} /><span>{WORKSPACE}</span><span className="muted">▾</span></button>
                    <button className="chip" type="button"><span>标准模式</span><span className="muted">▾</span></button>
                  </div>
                  <Composer
                    hero
                    draft={draft}
                    setDraft={setDraft}
                    running={running}
                    onSubmit={submit}
                    placeholder="描述你想要构建的内容… / 调用指令 @ 文件或对话"
                  />
                </div>
              </div>
            ) : (
              <>
                {tab === 'chat' ? (
                  <div className="chat-scroll">
                    <div className="chat-column">
                      {messages.map((message) => (
                        message.role === 'user' ? (
                          <article key={message.id} className="user-row"><div className="bubble">{message.text}</div></article>
                        ) : (
                          <article key={message.id} className="assistant-row">
                            <div className="assistant-text">{message.text}</div>
                            <div className="message-actions">
                              <button type="button" aria-label="重新生成" onClick={regenerate}><IconRefresh size={14} /></button>
                              <button type="button" className={liked[message.id] === 'up' ? 'on' : ''} aria-label="点赞" onClick={() => setLiked((current) => ({ ...current, [message.id]: 'up' }))}><IconThumbsUp size={14} /></button>
                              <button type="button" className={liked[message.id] === 'down' ? 'on' : ''} aria-label="点踩" onClick={() => setLiked((current) => ({ ...current, [message.id]: 'down' }))}><IconThumbsDown size={14} /></button>
                              <button type="button" aria-label="复制" onClick={() => void copyMessage(message)}>
                                {copiedId === message.id ? <IconCheck size={14} /> : <IconCopy size={14} />}
                              </button>
                            </div>
                          </article>
                        )
                      ))}
                      {running && <div className="thinking">正在生成…</div>}
                    </div>
                  </div>
                ) : (
                  <div className="trajectory">
                    {messages.length === 0 ? (
                      <div className="trajectory-empty">本会话还没有轨迹。</div>
                    ) : messages.map((message, index) => (
                      <div key={message.id} className="turn">
                        <span className="turn-role">{message.role === 'user' ? `用户 ${index + 1}` : '助手'}</span>
                        <span className="turn-text">{message.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="composer-seat">
                  <Composer
                    draft={draft}
                    setDraft={setDraft}
                    running={running}
                    onSubmit={submit}
                    placeholder="发消息或做任务… / 调用指令 @ 文件或对话"
                  />
                  <div className="stats">
                    {messages.filter((message) => message.role === 'user').length} 轮
                    <span className="sep">·</span>
                    Pi RPC
                    <span className="sep">·</span>
                    {statusLabel(status)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {overlay === 'market' && <MarketView onClose={() => setOverlay(null)} />}
      {overlay === 'settings' && <SettingsView status={status} onClose={() => setOverlay(null)} />}
    </div>
  )
}

function Composer({
  hero = false,
  draft,
  setDraft,
  running,
  onSubmit,
  placeholder,
}: {
  readonly hero?: boolean
  readonly draft: string
  readonly setDraft: (value: string) => void
  readonly running: boolean
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void
  readonly placeholder: string
}) {
  return (
    <form className={`input-bar ${hero ? 'hero' : ''}`} onSubmit={onSubmit}>
      <div className="card">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          rows={hero ? 2 : 1}
          aria-label="发送消息"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <div className="card-row">
          <div className="tools">
            <button className="add" type="button" aria-label="添加附件"><IconPlus size={16} /></button>
            <span className="mode-select" title="访问模式">
              <IconShield size={14} /> 完全权限
            </span>
          </div>
          <div className="trailing">
            <span className="model-select">Pi</span>
            <button className="send" type="submit" disabled={running || draft.trim() === ''} aria-label="发送消息">
              <IconArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

function MarketView({ onClose }: { readonly onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'installed'>('all')
  const [installed, setInstalled] = useState(() => new Set(starterMarketItems.filter((item) => item.installed).map((item) => item.id)))
  const items = useMemo(
    () => starterMarketItems.filter((item) => (filter === 'all' || installed.has(item.id)) && `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())),
    [filter, installed, query],
  )
  const toggleInstall = (item: MarketItem): void => {
    setInstalled((current) => {
      const next = new Set(current)
      if (next.has(item.id)) next.delete(item.id)
      else next.add(item.id)
      return next
    })
  }
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="插件市场">
      <button className="overlay-mask" type="button" aria-label="关闭插件市场" onClick={onClose} />
      <section className="panel">
        <header className="panel-head">
          <div>
            <h1>插件市场</h1>
            <p>技能、工作流，以及通过适配器或隔离宿主接入的 DSH UI 插件。</p>
          </div>
          <button className="icon-button" type="button" aria-label="关闭插件市场" onClick={onClose}><IconX /></button>
        </header>
        <div className="market-toolbar">
          <div className="market-tabs">
            <button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>发现</button>
            <button className={filter === 'installed' ? 'active' : ''} type="button" onClick={() => setFilter('installed')}>已安装 {installed.size}</button>
          </div>
          <label className="search-field">
            <IconSearch size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索插件" aria-label="搜索插件" />
          </label>
        </div>
        <div className="market-source">
          <span>已连接到 <strong>aiskill.market</strong> 的技能与工作流目录。</span>
          <button type="button" onClick={() => { void window.pi?.openExternal(AISKILL_MARKET_URL) }}>打开目录 <IconExternal size={12} /></button>
        </div>
        <div className="market-grid">
          {items.map((item) => (
            <article className="market-card" key={item.id}>
              <div className="market-card-top">
                <span className="market-glyph"><IconGrid size={16} /></span>
                <div className="market-card-title">
                  <strong>{item.name}</strong>
                  <small>{item.kind === 'dsh-ui' ? 'DSH UI 插件' : `${item.kind} / ${item.source}`}</small>
                </div>
                {item.featured && <span className="featured">精选</span>}
              </div>
              <p>{item.description}</p>
              <div className="market-card-bottom">
                <span className={`compatibility compatibility-${item.compatibility}`}>
                  {item.compatibility === 'native' ? 'Pi 原生' : item.compatibility === 'adapter' ? '适配器' : '隔离宿主'}
                </span>
                <button className={installed.has(item.id) ? 'installed-button' : 'install-button'} type="button" onClick={() => toggleInstall(item)}>
                  {installed.has(item.id) ? '已安装' : '安装'}
                </button>
              </div>
            </article>
          ))}
        </div>
        {items.length === 0 && <div className="empty-market"><strong>没有匹配的插件</strong><span>换个关键词，或打开在线目录。</span></div>}
      </section>
    </div>
  )
}

function SettingsView({ status, onClose }: { readonly status: PiStatus; readonly onClose: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="设置">
      <button className="overlay-mask" type="button" aria-label="关闭设置" onClick={onClose} />
      <section className="panel">
        <header className="panel-head">
          <div>
            <h1>设置</h1>
            <p>界面复刻 DeepSeek Harness。智能体内核仍是 Pi RPC，不会改动 Pi 核心。</p>
          </div>
          <button className="icon-button" type="button" aria-label="关闭设置" onClick={onClose}><IconX /></button>
        </header>
        <div className="settings-list">
          <div className="setting-row">
            <div>
              <strong>Pi 可执行文件</strong>
              <p>使用 <code>PI_DESKTOP_PI_BIN</code>，或从 PATH 解析 <code>pi</code>。</p>
            </div>
            <span className="setting-value">自动</span>
          </div>
          <div className="setting-row">
            <div>
              <strong>智能体模式</strong>
              <p>提示通过 Pi 的 JSONL RPC 协议发送。</p>
            </div>
            <span className="setting-value">RPC</span>
          </div>
          <div className="setting-row">
            <div>
              <strong>运行状态</strong>
              <p>{status.detail ?? '尚未启动 Pi 进程。'}</p>
            </div>
            <span className={`status-pill status-${status.state}`}><span className="status-dot" />{statusLabel(status)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}

function handlePiEvent(
  event: PiRpcEvent,
  setSessions: (update: (current: readonly Session[]) => readonly Session[]) => void,
  activeId: string,
  setRunning: (value: boolean) => void,
  setStatus: (status: PiStatus) => void,
): void {
  if (event.type === 'agent_start') { setRunning(true); setStatus({ state: 'ready' }); return }
  if (event.type === 'agent_end' || event.type === 'agent_settled') { setRunning(false); return }
  if (event.type !== 'message_update') return
  const delta = event.assistantMessageEvent
  if (delta === null || typeof delta !== 'object') return
  const typedDelta = delta as { readonly type?: unknown; readonly delta?: unknown }
  const deltaText = typedDelta.delta
  if (typedDelta.type !== 'text_delta' || typeof deltaText !== 'string') return
  setSessions((current) => current.map((session) => {
    if (session.id !== activeId) return session
    const last = session.messages[session.messages.length - 1]
    const messages = last?.role === 'assistant' && last.id === 'streaming'
      ? [...session.messages.slice(0, -1), { ...last, text: last.text + deltaText }]
      : [...session.messages, { id: 'streaming', role: 'assistant' as const, text: deltaText }]
    return { ...session, messages, updatedAt: Date.now() }
  }))
}

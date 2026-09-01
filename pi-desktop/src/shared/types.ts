export type PiStatusState = 'offline' | 'starting' | 'ready' | 'error'

export interface PiStatus {
  readonly state: PiStatusState
  readonly detail?: string
}

export interface PiRpcEvent {
  readonly type: string
  readonly [key: string]: unknown
}

export interface PromptResult {
  readonly accepted: boolean
  readonly error?: string
}

export type PluginKind = 'extension' | 'skill' | 'workflow' | 'dsh-ui'

export interface PluginManifest {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly kind: PluginKind
  readonly description: string
  readonly source: string
  readonly compatibility: 'native' | 'adapter' | 'isolated'
}

export interface MarketItem extends PluginManifest {
  readonly installed: boolean
  readonly featured?: boolean
}

export const AISKILL_MARKET_URL = 'https://aiskill.market/'

export const starterMarketItems: readonly MarketItem[] = [
  {
    id: 'aiskill:code-review',
    name: 'Code Review',
    version: '1.4.0',
    kind: 'skill',
    description: 'Review a change for correctness, regressions, and missing tests.',
    source: 'aiskill.market',
    compatibility: 'native',
    installed: true,
    featured: true,
  },
  {
    id: 'aiskill:browser-research',
    name: 'Browser Research',
    version: '0.8.2',
    kind: 'skill',
    description: 'Turn a research question into a sourced, concise brief.',
    source: 'aiskill.market',
    compatibility: 'native',
    installed: false,
    featured: true,
  },
  {
    id: 'dsh:session-inspector',
    name: 'Session Inspector',
    version: '2.0.1',
    kind: 'dsh-ui',
    description: 'A DSH conversation panel surfaced through the compatibility adapter.',
    source: 'DeepSeek UI plugins',
    compatibility: 'adapter',
    installed: false,
  },
  {
    id: 'dsh:trajectory-viewer',
    name: 'Trajectory Viewer',
    version: '1.2.0',
    kind: 'dsh-ui',
    description: 'Inspect tool calls and turn details in an isolated DSH host.',
    source: 'DeepSeek UI plugins',
    compatibility: 'isolated',
    installed: false,
  },
]

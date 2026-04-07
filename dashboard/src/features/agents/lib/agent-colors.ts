type AgentStyle = {
  dot: string
  bg: string
  border: string
}

const AGENT_STYLES: Record<string, AgentStyle> = {
  Explore: {
    dot: 'bg-sky-500',
    bg: 'bg-sky-500/8',
    border: 'border-sky-500/30',
  },
  Plan: {
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-500/8',
    border: 'border-indigo-500/30',
  },
  'general-purpose': {
    dot: 'bg-slate-400',
    bg: 'bg-slate-400/8',
    border: 'border-slate-400/30',
  },
  'page-builder': {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/30',
  },
  'infra-builder': {
    dot: 'bg-amber-500',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/30',
  },
  'plan-writer': {
    dot: 'bg-violet-500',
    bg: 'bg-violet-500/8',
    border: 'border-violet-500/30',
  },
  'data-seeder': {
    dot: 'bg-orange-500',
    bg: 'bg-orange-500/8',
    border: 'border-orange-500/30',
  },
  'merge-manager': {
    dot: 'bg-rose-500',
    bg: 'bg-rose-500/8',
    border: 'border-rose-500/30',
  },
  'claude-code-guide': {
    dot: 'bg-cyan-500',
    bg: 'bg-cyan-500/8',
    border: 'border-cyan-500/30',
  },
}

const DEFAULT_STYLE: AgentStyle = {
  dot: 'bg-slate-400',
  bg: 'bg-slate-400/8',
  border: 'border-slate-400/30',
}

export const getAgentStyle = (name: string): AgentStyle =>
  AGENT_STYLES[name] ?? DEFAULT_STYLE

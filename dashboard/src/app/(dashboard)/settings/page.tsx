'use client'

import { useState } from 'react'
import { Palette, Cog, Plug, FolderPlus, Workflow } from 'lucide-react'
import { useLocale } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import { FilterBar } from '@/shared/components/filter-bar'
import {
  GeneralSection,
  PricingSection,
  SetupSection,
  ProjectConnectionSection,
  HooksSection,
} from '@/features/settings'
import type { Category } from '@/features/settings/types/settings'

const SECTION_MAP: Record<Category, React.FC> = {
  general: GeneralSection,
  pricing: PricingSection,
  agentConnection: SetupSection,
  projectConnection: ProjectConnectionSection,
  hooksConnection: HooksSection,
}

export default function SettingsPage() {
  const [active, setActive] = useState<Category>('general')
  const { t } = useLocale()
  const ActiveSection = SECTION_MAP[active]

  const categories: { key: Category; labelKey: string; icon: React.ElementType }[] = [
    { key: 'general', labelKey: 'settings.general', icon: Palette },
    { key: 'pricing', labelKey: 'settings.pricing', icon: Cog },
    { key: 'agentConnection', labelKey: 'settings.agentConnection', icon: Plug },
    { key: 'projectConnection', labelKey: 'settings.projectConnection', icon: FolderPlus },
    { key: 'hooksConnection', labelKey: 'settings.hooks', icon: Workflow },
  ]

  return (
    <div className="flex h-full flex-col">
      <FilterBar><span className="text-sm font-semibold">{t('settings.title')}</span></FilterBar>

      <div className="flex overflow-x-auto gap-2 px-4 pb-2 pt-2 md:hidden">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActive(cat.key)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-sm shrink-0 transition-colors',
              active === cat.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <cat.icon className="size-3.5" />
            {t(cat.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">
        <nav className="hidden md:flex w-48 shrink-0 border-r border-[var(--border-subtle)] overflow-y-auto py-4 px-2 flex-col">
          <ul className="space-y-0.5">
            {categories.map((cat) => (
              <li key={cat.key}>
                <button
                  onClick={() => setActive(cat.key)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    active === cat.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <cat.icon className="size-4" />
                  {t(cat.labelKey)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 p-6 overflow-y-auto">
          <ActiveSection />
        </main>
      </div>
    </div>
  )
}

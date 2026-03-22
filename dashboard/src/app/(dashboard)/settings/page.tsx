'use client'

import { useState } from 'react'
import { Palette, Cog, Plug, FolderPlus } from 'lucide-react'
import { useLocale } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import { FilterBar } from '@/shared/components/filter-bar'
import {
  GeneralSection,
  PricingSection,
  SetupSection,
  ProjectConnectionSection,
} from '@/features/settings'
import type { Category } from '@/features/settings/types/settings'

const SECTION_MAP: Record<Category, React.FC> = {
  general: GeneralSection,
  pricing: PricingSection,
  agentConnection: SetupSection,
  projectConnection: ProjectConnectionSection,
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
  ]

  return (
    <div className="flex h-full flex-col">
      <FilterBar><span className="text-sm font-semibold">{t('settings.title')}</span></FilterBar>
      <div className="flex flex-1 min-h-0">
        <nav className="w-48 shrink-0 border-r border-[var(--border-subtle)] overflow-y-auto py-4 px-2">
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

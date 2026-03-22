'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { ProjectRow } from '@/shared/lib/queries'
import { projectsService } from '@/shared/services'
import { useLocale } from '@/shared/lib/i18n'

type ProjectFilterProps = {
  value: string
  onChange: (value: string) => void
}

export const ProjectFilter = ({ value, onChange }: ProjectFilterProps) => {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const { t } = useLocale()

  useEffect(() => {
    projectsService.getProjects()
      .then((data) => setProjects(data as ProjectRow[]))
      .catch(() => setProjects([]))
  }, [])

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? 'all')}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={t('shared.projectFilter.allProjects')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('shared.projectFilter.allProjects')}</SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.project_name} value={p.project_name}>
            {p.project_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

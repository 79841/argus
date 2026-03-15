'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProjectRow } from '@/lib/queries'
import { dataClient } from '@/lib/data-client'

type ProjectFilterProps = {
  value: string
  onChange: (value: string) => void
}

export const ProjectFilter = ({ value, onChange }: ProjectFilterProps) => {
  const [projects, setProjects] = useState<ProjectRow[]>([])

  useEffect(() => {
    dataClient.query('projects')
      .then((data) => setProjects(data as ProjectRow[]))
      .catch(() => setProjects([]))
  }, [])

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? 'all')}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="All Projects" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Projects</SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.project_name} value={p.project_name}>
            {p.project_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

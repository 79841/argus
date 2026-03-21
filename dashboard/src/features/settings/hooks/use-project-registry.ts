'use client'

import { useState, useEffect, useCallback } from 'react'
import { projectsService } from '@/shared/services'
import type { RegistryProject } from '@/types/settings'

export const useProjectRegistry = () => {
  const [projects, setProjects] = useState<RegistryProject[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [pathInput, setPathInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectsService.getProjectRegistry()
      setProjects((data.projects ?? []) as unknown as RegistryProject[])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined

  const handleAdd = async () => {
    if (!pathInput.trim()) return
    setError(null)
    const name = nameInput.trim() || pathInput.trim().split(/[/\\]/).pop() || 'untitled'
    setAdding(true)
    try {
      const res = await projectsService.addProject({ name, path: pathInput.trim() }) as { error?: string }
      if (res.error) {
        setError(res.error)
        setAdding(false)
        return
      }
      setPathInput('')
      setNameInput('')
      setAdding(false)
      await loadProjects()
    } catch {
      setError('Failed to connect project')
      setAdding(false)
    }
  }

  const handleBrowse = async () => {
    if (isElectron && window.electronAPI?.selectFolder) {
      const folder = await window.electronAPI.selectFolder('Select Project Folder')
      if (folder) {
        setPathInput(folder)
        const name = folder.split(/[/\\]/).pop() || ''
        setNameInput(name)
        setError(null)
      }
    }
  }

  const handleDisconnect = async (name: string) => {
    try {
      await projectsService.deleteProject(name)
      await loadProjects()
    } catch {
      // ignore
    }
  }

  const cancelAdd = () => {
    setShowAddForm(false)
    setPathInput('')
    setNameInput('')
    setError(null)
  }

  return {
    projects,
    loading,
    adding,
    pathInput,
    setPathInput,
    nameInput,
    setNameInput,
    error,
    setError,
    showAddForm,
    setShowAddForm,
    isElectron,
    handleAdd,
    handleBrowse,
    handleDisconnect,
    cancelAdd,
  }
}

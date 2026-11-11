import * as React from 'react'
import type { Project, Task, TaskStatus } from '@shared/types'
import { toast } from 'sonner'
import { api } from './api'

const STATUSES: TaskStatus[] = ['inbox', 'next', 'waiting', 'done']
type TaskPatch = Partial<Pick<Task, 'title' | 'status' | 'project_id'>>

// Patches apply locally first, then persist; failures restore the exact previous object.
const patchTasks = (prev: Task[], id: string, patch: TaskPatch): Task[] =>
  prev.map((task) => (task.id === id ? { ...task, ...patch } : task))

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong')

export function useTasks() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const tasksRef = React.useRef(tasks)

  React.useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  const reload = React.useCallback(async () => {
    try {
      setError(null)
      setTasks(await api.listTasks())
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const createTask = React.useCallback(async (title: string) => {
    try {
      const task = await api.createTask(title)
      setTasks((prev) => [task, ...prev])
      toast.success('Task captured in Inbox')
      return task
    } catch (cause) {
      toast.error('Could not add task', { description: errorMessage(cause) })
      throw cause
    }
  }, [])

  const updateTask = React.useCallback(async (id: string, patch: TaskPatch) => {
    const previous = tasksRef.current.find((task) => task.id === id)
    if (!previous) return
    setTasks((prev) => patchTasks(prev, id, patch))
    try {
      const saved = await api.updateTask(id, patch)
      setTasks((prev) => prev.map((task) => (task.id === id ? saved : task)))
      return saved
    } catch (cause) {
      setTasks((prev) => prev.map((task) => (task.id === id ? previous : task)))
      toast.error('Change not saved', {
        description: errorMessage(cause),
        action: { label: 'Retry', onClick: () => void updateTask(id, patch) },
      })
      throw cause
    }
  }, [])

  const deleteTask = React.useCallback(async (id: string) => {
    const previous = tasksRef.current
    const removed = previous.find((task) => task.id === id)
    setTasks((prev) => prev.filter((task) => task.id !== id))
    try {
      await api.deleteTask(id)
      toast.success('Task deleted')
    } catch (cause) {
      setTasks(previous)
      toast.error('Task not deleted', {
        description: errorMessage(cause),
        action: { label: 'Retry', onClick: () => removed && void deleteTask(removed.id) },
      })
      throw cause
    }
  }, [])

  const counts = React.useMemo(
    () =>
      STATUSES.reduce<Record<TaskStatus, number>>(
        (acc, status) => ({ ...acc, [status]: tasks.filter((task) => task.status === status).length }),
        { inbox: 0, next: 0, waiting: 0, done: 0 },
      ),
    [tasks],
  )

  return { tasks, loading, error, counts, reload, createTask, updateTask, deleteTask }
}

export function useProjects() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    api
      .listProjects()
      .then(setProjects)
      .catch((cause) => setError(errorMessage(cause)))
      .finally(() => setLoading(false))
  }, [])

  const createProject = React.useCallback(async (name: string) => {
    const project = await api.createProject(name)
    setProjects((prev) => [...prev, project])
    return project
  }, [])

  const updateProject = React.useCallback(async (id: string, patch: Partial<Pick<Project, 'name' | 'status'>>) => {
    const previous = projects.find((project) => project.id === id)
    setProjects((prev) => prev.map((project) => (project.id === id ? { ...project, ...patch } : project)))
    try {
      const saved = await api.updateProject(id, patch)
      setProjects((prev) => prev.map((project) => (project.id === id ? saved : project)))
      return saved
    } catch (cause) {
      if (previous) setProjects((prev) => prev.map((project) => (project.id === id ? previous : project)))
      throw cause
    }
  }, [projects])

  const deleteProject = React.useCallback(async (id: string) => {
    // The API answers 409 with blocking tasks; surface them in the dialog instead of guessing.
    await api.deleteProject(id)
    setProjects((prev) => prev.filter((project) => project.id !== id))
  }, [])

  return { projects, loading, error, createProject, updateProject, deleteProject }
}

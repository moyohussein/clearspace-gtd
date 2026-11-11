import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiError, BlockingTask, Project, ProjectStatus } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PROJECT_STATUS_LABEL } from '@/components/task-item'
import { api, ApiRequestError } from '@/lib/api'

const PROJECT_STATUSES: ProjectStatus[] = ['active', 'someday', 'archive']

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
  onCreate: (name: string) => Promise<Project>
  onUpdate: (id: string, patch: Partial<Pick<Project, 'name' | 'status'>>) => Promise<Project>
}) {
  const [name, setName] = React.useState('')
  const [status, setStatus] = React.useState<ProjectStatus>('active')
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const nameRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open) return
    setName(project?.name ?? '')
    setStatus(project?.status ?? 'active')
    setError(null)
  }, [open, project])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const value = name.trim()
    if (!value) {
      setError('Project name is required')
      nameRef.current?.focus()
      return
    }
    if (value.length > 100) return setError('Keep the name under 100 characters')
    setSaving(true)
    try {
      if (project) {
        await onUpdate(project.id, { name: value, status })
        toast.success('Project updated')
      } else {
        await onCreate(value)
        toast.success(`Created “${value}”`)
      }
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{project ? 'Edit project' : 'New project'}</DialogTitle>
            <DialogDescription>
              {project ? 'Rename it or change where it sits in your system.' : 'Group related next actions under an outcome.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              ref={nameRef}
              autoFocus
              value={name}
              maxLength={101}
              placeholder="e.g. Home studio setup"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'project-name-error' : undefined}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
            />
            {error && (
              <p id="project-name-error" role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as ProjectStatus)}>
              <SelectTrigger id="project-status" className="w-full" aria-label="Project status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {PROJECT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PROJECT_STATUS_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : project ? 'Save changes' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  project,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
  onDelete: (id: string) => Promise<void>
}) {
  const [blocking, setBlocking] = React.useState<BlockingTask[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setBlocking(null)
    setError(null)
  }, [open, project?.id])

  // Pre-flight so the dialog can list blocking tasks instead of springing a 409 on the user.
  React.useEffect(() => {
    if (!open || !project) return
    let active = true
    api
      .listTasks()
      .then((tasks) => {
        if (!active) return
        setBlocking(
          tasks
            .filter((task) => task.project_id === project.id)
            .map((task) => ({ id: task.id, title: task.title, status: task.status })),
        )
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [open, project])

  async function confirm() {
    if (!project) return
    setDeleting(true)
    setError(null)
    try {
      await onDelete(project.id)
      toast.success(`Deleted “${project.name}”`)
      onOpenChange(false)
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 409) {
        setBlocking(cause.blockingTasks ?? [])
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not delete the project')
      }
    } finally {
      setDeleting(false)
    }
  }

  const blocked = Boolean(blocking?.length)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{blocked ? 'This project still has tasks' : 'Delete project?'}</DialogTitle>
          <DialogDescription>
            {blocked
              ? `Move or delete these ${blocking?.length} task${blocking?.length === 1 ? '' : 's'} before deleting “${project?.name}”.`
              : `“${project?.name}” will be removed permanently. Tasks are never deleted with a project.`}
          </DialogDescription>
        </DialogHeader>

        {blocked && (
          <ul className="max-h-48 overflow-y-auto rounded-lg bg-muted/60 p-2 text-sm" aria-live="polite">
            {blocking?.map((task) => (
              <li key={task.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                <span className="text-xs text-muted-foreground">{task.status}</span>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {blocked ? 'Close' : 'Cancel'}
          </DialogClose>
          {!blocked && (
            <Button type="button" variant="destructive" onClick={() => void confirm()} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete project'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type { ApiError }

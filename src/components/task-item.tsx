import * as React from 'react'
import { ArrowRight, Check, Circle, Clock, Ellipsis, FolderInput, Inbox, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Project, Task, TaskStatus } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from 'cn'

export const STATUS_META: Record<TaskStatus, { label: string; icon: React.ElementType; description: string }> = {
  inbox: { label: 'Inbox', icon: Inbox, description: 'Captured, not yet processed' },
  next: { label: 'Next', icon: ArrowRight, description: 'Ready to do next' },
  waiting: { label: 'Waiting', icon: Clock, description: 'Blocked on someone or something' },
  done: { label: 'Done', icon: Check, description: 'Completed' },
}

export const PROJECT_STATUS_LABEL = { active: 'Active', someday: 'Someday', archive: 'Archived' } as const

type TaskItemProps = {
  task: Task
  project?: Project
  projects: Project[]
  onUpdate: (patch: Partial<Pick<Task, 'title' | 'status' | 'project_id'>>) => Promise<unknown>
  onDelete: () => Promise<unknown>
}

export function TaskItem({ task, project, projects, onUpdate, onDelete }: TaskItemProps) {
  const [editing, setEditing] = React.useState(false)
  const [title, setTitle] = React.useState(task.title)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isDone = task.status === 'done'

  React.useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function startEditing() {
    setTitle(task.title)
    setError(null)
    setEditing(true)
  }

  async function saveTitle(event: React.FormEvent) {
    event.preventDefault()
    const next = title.trim()
    if (!next) return setError('Title is required')
    if (next.length > 200) return setError('Keep the title under 200 characters')
    if (next === task.title) {
      setEditing(false)
      return
    }
    try {
      await onUpdate({ title: next })
      setEditing(false)
    } catch {
      setError('Could not save the new title')
    }
  }

  async function move(status: TaskStatus) {
    if (status === task.status) return
    try {
      await onUpdate({ status })
      toast.success(`Moved to ${STATUS_META[status].label}`)
    } catch {
      // The hook already rolled back and showed a toast.
    }
  }

  async function assign(projectId: string) {
    const next = projectId === 'none' ? null : projectId
    try {
      await onUpdate({ project_id: next })
      toast.success(next ? 'Project updated' : 'Removed from project')
    } catch {
      // rollback toast comes from the hook
    }
  }

  return (
    <li
      data-testid="task-item"
      className={cn(
        'group flex items-start gap-2 border-b border-border bg-card px-3 py-2.5 transition-colors last:border-b-0 sm:items-center sm:gap-3 sm:px-4',
        editing && 'bg-accent/40',
      )}
    >
      <Button
        variant={isDone ? 'success' : 'ghost'}
        size="icon-sm"
        className={cn('mt-0.5 shrink-0 sm:mt-0', isDone && 'text-success')}
        aria-label={isDone ? `Reopen "${task.title}"` : `Complete "${task.title}"`}
        aria-pressed={isDone}
        onClick={() => void (isDone ? move('next') : move('done'))}
      >
        {isDone ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
      </Button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={saveTitle} className="flex flex-col gap-1.5" noValidate>
            <label htmlFor={`edit-${task.id}`} className="sr-only">
              Task title
            </label>
            <InputGroup>
              <InputGroupInput
                id={`edit-${task.id}`}
                ref={inputRef}
                value={title}
                maxLength={201}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `edit-error-${task.id}` : undefined}
                onChange={(event) => {
                  setTitle(event.target.value)
                  setError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setEditing(false)
                }}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="submit" size="icon-xs" aria-label="Save title">
                  <Check aria-hidden="true" />
                </InputGroupButton>
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  aria-label="Cancel editing"
                  onClick={() => setEditing(false)}
                >
                  <X aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {error && (
              <p id={`edit-error-${task.id}`} role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            )}
          </form>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="block w-full rounded-sm text-left text-sm leading-snug font-medium text-wrap outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label={`Edit "${task.title}"`}
          >
            <span className={cn(isDone && 'text-muted-foreground line-through decoration-border')}>{task.title}</span>
          </button>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[11px] font-normal">
            {React.createElement(STATUS_META[task.status].icon, { className: 'size-3', 'aria-hidden': true })}
            {STATUS_META[task.status].label}
          </Badge>
          {project && (
            <span className="truncate">
              in <span className="font-medium text-soft-foreground">{project.name}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {/* Same select at every breakpoint: touch targets stay usable on phones. */}
        <Select value={task.project_id ?? 'none'} onValueChange={(value) => void assign(String(value))}>
          <SelectTrigger
            size="sm"
            className="max-w-28 gap-1 text-xs text-muted-foreground sm:max-w-36"
            aria-label={`Project for "${task.title}"`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="none">No project</SelectItem>
            {projects.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for "${task.title}"`}
                className="text-muted-foreground"
              />
            }
          >
            <Ellipsis aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={startEditing}>
              <Pencil aria-hidden="true" /> Edit title
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void assign(task.project_id ?? 'none')}>
              <FolderInput aria-hidden="true" /> Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {(Object.keys(STATUS_META) as TaskStatus[]).map((status) => (
                <DropdownMenuItem
                  key={status}
                  disabled={status === task.status}
                  onClick={() => void move(status)}
                >
                  {React.createElement(STATUS_META[status].icon, { 'aria-hidden': true })}
                  {STATUS_META[status].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                void onDelete().catch(() => {})
                toast.message(`Deleted "${task.title}"`, { duration: 2000 })
              }}
            >
              <Trash2 aria-hidden="true" /> Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

export function TaskItemSkeleton() {
  return (
    <li className="flex items-center gap-3 border-b border-border bg-card px-3 py-3 last:border-b-0">
      <span className="size-7 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="h-3 w-3/5 animate-pulse rounded-sm bg-muted" />
        <span className="h-2.5 w-24 animate-pulse rounded-sm bg-muted/70" />
      </div>
    </li>
  )
}

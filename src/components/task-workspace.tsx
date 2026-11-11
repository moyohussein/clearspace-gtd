import * as React from 'react'
import { AlertCircle, ArrowRight } from 'lucide-react'
import type { Project, Task, TaskStatus } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuickAdd } from '@/components/quick-add'
import { STATUS_META, TaskItem, TaskItemSkeleton } from '@/components/task-item'

const STATUSES: TaskStatus[] = ['inbox', 'next', 'waiting', 'done']

type TaskWorkspaceProps = {
  status: TaskStatus
  onStatusChange: (status: TaskStatus) => void
  tasks: Task[]
  projects: Project[]
  counts: Record<TaskStatus, number>
  loading: boolean
  error: string | null
  onReload: () => void
  onCreate: (title: string) => Promise<unknown>
  onUpdate: (id: string, patch: Partial<Pick<Task, 'title' | 'status' | 'project_id'>>) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
  onProcessInbox: () => void
  quickAddRef: React.RefObject<HTMLInputElement | null>
}

export function TaskWorkspace(props: TaskWorkspaceProps) {
  const { status, tasks, projects, counts, loading, error, onReload, onProcessInbox } = props
  const projectById = React.useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const visible = tasks.filter((task) => task.status === status)
  const meta = STATUS_META[status]

  return (
    <div className="flex flex-col gap-5">
      <QuickAdd onAdd={props.onCreate} inputRef={props.quickAddRef} />

      <Tabs value={status} onValueChange={(value) => props.onStatusChange(value as TaskStatus)}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList variant="line" aria-label="Filter tasks by status" className="gap-1">
            {STATUSES.map((value) => {
              const ItemIcon = STATUS_META[value].icon
              return (
                <TabsTrigger key={value} value={value} className="gap-1.5 px-2.5">
                  <ItemIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{STATUS_META[value].label}</span>
                  <span
                    className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[11px] font-semibold text-muted-foreground tabular-nums"
                    aria-label={`${counts[value]} tasks`}
                  >
                    {counts[value]}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{meta.label}</span> · {meta.description}
        </p>
        {status === 'inbox' && counts.inbox > 0 && (
          <Button size="sm" variant="outline" onClick={onProcessInbox}>
            Process inbox
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Button>
        )}
      </div>

      {loading ? (
        <ul className="overflow-hidden rounded-xl ring-1 ring-foreground/10" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading tasks…</span>
          {[0, 1, 2].map((key) => (
            <TaskItemSkeleton key={key} />
          ))}
        </ul>
      ) : error ? (
        <div role="alert" className="rounded-xl ring-1 ring-foreground/10">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
                <AlertCircle aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Tasks didn’t load</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={onReload}>
                Try again
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl ring-1 ring-foreground/10">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {React.createElement(meta.icon, { 'aria-hidden': true })}
              </EmptyMedia>
              <EmptyTitle>{emptyCopy[status].title}</EmptyTitle>
              <EmptyDescription>{emptyCopy[status].body}</EmptyDescription>
            </EmptyHeader>
            {status === 'inbox' && (
              <EmptyContent>
                <Button variant="outline" onClick={() => props.quickAddRef.current?.focus()}>
                  Capture a new task
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </div>
      ) : (
        <>
          <ul
            aria-label={`${meta.label} tasks`}
            className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10"
          >
            {visible.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                project={task.project_id ? projectById.get(task.project_id) : undefined}
                projects={projects}
                onUpdate={(patch) => props.onUpdate(task.id, patch)}
                onDelete={() => props.onDelete(task.id)}
              />
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Showing {visible.length} {meta.label.toLowerCase()} {visible.length === 1 ? 'task' : 'tasks'}
            {visible.some((task) => task.status === 'done') && ' · completed items stay here for reference'}
          </p>
        </>
      )}
    </div>
  )
}

const emptyCopy: Record<TaskStatus, { title: string; body: string }> = {
  inbox: {
    title: 'Inbox zero',
    body: 'Everything is processed. Capture the next thought without breaking your focus.',
  },
  next: {
    title: 'No next actions',
    body: 'Process your inbox to decide what to do next.',
  },
  waiting: {
    title: 'Nothing is waiting',
    body: 'Use Waiting for anything blocked on someone else.',
  },
  done: {
    title: 'Nothing completed yet',
    body: 'Finished tasks collect here so you can see the progress.',
  },
}

export function StatusSummary({ counts }: { counts: Record<TaskStatus, number> }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Tasks by status">
      {STATUSES.map((status) => {
        const ItemIcon = STATUS_META[status].icon
        return (
          <div key={status} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-2 ring-1 ring-foreground/10">
            <ItemIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">{STATUS_META[status].label} tasks</dt>
            <dd className="flex items-baseline gap-1 text-xs text-muted-foreground">
              <span className="text-base font-semibold text-foreground tabular-nums">{counts[status]}</span>
              {STATUS_META[status].label}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

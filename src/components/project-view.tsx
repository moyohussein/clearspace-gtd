import { ArrowLeft, FolderOpen } from 'lucide-react'
import type { Project, Task } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { PROJECT_STATUS_LABEL, TaskItem, TaskItemSkeleton } from '@/components/task-item'

const ORDER = { next: 0, waiting: 1, inbox: 2, done: 3 } as const

export function ProjectView({
  project,
  tasks,
  allProjects,
  loading,
  onBack,
  onUpdate,
  onDelete,
}: {
  project: Project
  tasks: Task[]
  allProjects: Project[]
  loading: boolean
  onBack: () => void
  onUpdate: (id: string, patch: Partial<Pick<Task, 'title' | 'status' | 'project_id'>>) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}) {
  const projectTasks = tasks
    .filter((task) => task.project_id === project.id)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.created_at.localeCompare(a.created_at))
  const open = projectTasks.filter((task) => task.status !== 'done').length

  return (
    <section aria-labelledby="project-view-heading" className="flex min-w-0 flex-col gap-4">
      <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={onBack}>
        <ArrowLeft aria-hidden="true" data-icon="inline-start" />
        All projects
      </Button>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="project-view-heading" className="text-xl font-semibold tracking-tight">
            {project.name}
          </h2>
          <Badge variant="outline">{PROJECT_STATUS_LABEL[project.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {open} open {open === 1 ? 'task' : 'tasks'} · {projectTasks.length - open} done
        </p>
      </div>

      {loading ? (
        <ul className="overflow-hidden rounded-xl ring-1 ring-foreground/10" aria-busy="true">
          <span className="sr-only">Loading project tasks…</span>
          {[0, 1].map((key) => (
            <TaskItemSkeleton key={key} />
          ))}
        </ul>
      ) : projectTasks.length === 0 ? (
        <div className="rounded-xl ring-1 ring-foreground/10">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpen aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No tasks in this project</EmptyTitle>
              <EmptyDescription>Assign tasks from the Inbox to start moving this outcome forward.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={onBack}>
                Back to the board
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <ul aria-label={`${project.name} tasks`} className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {projectTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projects={allProjects}
              onUpdate={(patch) => onUpdate(task.id, patch)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

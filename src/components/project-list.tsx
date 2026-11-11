import * as React from 'react'
import { Ellipsis, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Project, ProjectStatus } from '@shared/types'
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
import { PROJECT_STATUS_LABEL } from '@/components/task-item'
import { cn } from 'cn'

export type ProjectFilter = 'all' | ProjectStatus

const FILTERS: { value: ProjectFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'someday', label: 'Someday' },
  { value: 'archive', label: 'Archived' },
]

export function ProjectList({
  projects,
  tasksByProject,
  loading,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onChangeStatus,
  onDelete,
}: {
  projects: Project[]
  tasksByProject: Map<string, number>
  loading: boolean
  selectedId?: string
  onSelect: (project: Project) => void
  onCreate: () => void
  onEdit: (project: Project) => void
  onChangeStatus: (project: Project, status: ProjectStatus) => void
  onDelete: (project: Project) => void
}) {
  const [filter, setFilter] = React.useState<ProjectFilter>('all')
  const visible = filter === 'all' ? projects : projects.filter((project) => project.status === filter)

  return (
    <section aria-labelledby="projects-heading" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="projects-heading" className="text-base font-semibold tracking-tight">
            Projects
          </h2>
          <p className="text-xs text-muted-foreground">{projects.length} outcomes to move forward</p>
        </div>
        <Button size="sm" onClick={onCreate}>
          <Plus aria-hidden="true" data-icon="inline-start" />
          New project
        </Button>
      </div>

      <div role="group" aria-label="Filter projects by status" className="-mx-1 flex flex-wrap gap-1 px-1">
        {FILTERS.map((option) => {
          const count =
            option.value === 'all' ? projects.length : projects.filter((project) => project.status === option.value).length
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                'h-7 rounded-full border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                filter === option.value
                  ? 'border-foreground/15 bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {option.label} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <ul aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">Loading projects…</span>
          {[0, 1, 2].map((key) => (
            <li key={key} className="h-[62px] animate-pulse rounded-xl bg-muted/70" />
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          No {filter === 'all' ? '' : PROJECT_STATUS_LABEL[filter].toLowerCase()} projects yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((project) => {
            const count = tasksByProject.get(project.id) ?? 0
            const selected = selectedId === project.id
            return (
              <li
                key={project.id}
                data-testid="project-item"
                className={cn(
                  'group flex items-start gap-2 rounded-xl bg-card px-3 py-2.5 ring-1 ring-foreground/10 transition-colors',
                  selected && 'ring-2 ring-primary/60',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(project)}
                  aria-current={selected ? 'true' : undefined}
                  className="flex min-w-0 flex-1 items-start gap-2.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <FolderOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{project.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                        {PROJECT_STATUS_LABEL[project.status]}
                      </Badge>
                      {count} {count === 1 ? 'task' : 'tasks'}
                    </span>
                  </span>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Actions for project ${project.name}`}
                        className="text-muted-foreground"
                      />
                    }
                  >
                    <Ellipsis aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onEdit(project)}>
                      <Pencil aria-hidden="true" /> Rename project
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((status) => (
                        <DropdownMenuItem
                          key={status}
                          disabled={status === project.status}
                          onClick={() => onChangeStatus(project, status)}
                        >
                          {PROJECT_STATUS_LABEL[status]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(project)}>
                      <Trash2 aria-hidden="true" /> Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

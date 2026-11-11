import * as React from 'react'
import { Toaster, toast } from 'sonner'
import type { Project, ProjectStatus, Task, TaskStatus } from '@shared/types'
import { AppShell, PageHeader } from '@/components/app-shell'
import { InboxProcessor } from '@/components/inbox-processor'
import { DeleteProjectDialog, ProjectFormDialog } from '@/components/project-dialogs'
import { ProjectList } from '@/components/project-list'
import { ProjectView } from '@/components/project-view'
import { ShortcutHelp } from '@/components/shortcut-help'
import { TaskWorkspace } from '@/components/task-workspace'
import { useProjects, useTasks } from '@/lib/hooks'
import { ThemeProvider } from '@/lib/theme'

type View = { kind: 'board' } | { kind: 'project'; id: string }

function Workspace() {
  const taskState = useTasks()
  const projectState = useProjects()
  const [view, setView] = React.useState<View>({ kind: 'board' })
  const [status, setStatus] = React.useState<TaskStatus>('inbox')
  const [processing, setProcessing] = React.useState(false)
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Project | undefined>()
  const [deleting, setDeleting] = React.useState<Project | undefined>()
  const quickAddRef = React.useRef<HTMLInputElement>(null)

  const selectedProject = view.kind === 'project' ? projectState.projects.find((p) => p.id === view.id) : undefined

  const tasksByProject = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const task of taskState.tasks) {
      if (task.project_id && task.status !== 'done') counts.set(task.project_id, (counts.get(task.project_id) ?? 0) + 1)
    }
    return counts
  }, [taskState.tasks])

  const openNewTask = React.useCallback(() => {
    setView({ kind: 'board' })
    requestAnimationFrame(() => {
      quickAddRef.current?.focus()
      quickAddRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      const typing =
        target?.closest('input, textarea, select, [contenteditable="true"]') ||
        target?.getAttribute('role') === 'combobox' ||
        document.querySelector('[data-slot="dialog-content"]')
      if (typing) return
      if (event.key === 'n') {
        event.preventDefault()
        openNewTask()
      } else if (event.key === '?') {
        event.preventDefault()
        setHelpOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openNewTask])

  async function changeProjectStatus(project: Project, next: ProjectStatus) {
    try {
      await projectState.updateProject(project.id, { status: next })
      toast.success(`“${project.name}” moved to ${next}`)
    } catch (cause) {
      toast.error('Project status not saved', { description: cause instanceof Error ? cause.message : undefined })
    }
  }

  const updateTask = taskState.updateTask
  const deleteTask = taskState.deleteTask

  return (
    <AppShell
      counts={taskState.counts}
      inboxCount={taskState.counts.inbox}
      view={view.kind}
      onNavigateBoard={() => setView({ kind: 'board' })}
      onNewTask={openNewTask}
      onOpenHelp={() => setHelpOpen(true)}
    >
      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        {selectedProject ? (
          <ProjectView
            project={selectedProject}
            tasks={taskState.tasks}
            allProjects={projectState.projects}
            loading={taskState.loading}
            onBack={() => setView({ kind: 'board' })}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        ) : (
          <>
            <PageHeader
              title="Your mind, cleared."
              description="Capture anything, then decide what's actually next. A calm GTD workspace that stays out of your way."
              counts={taskState.counts}
            />

            <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
              <TaskWorkspace
                status={status}
                onStatusChange={setStatus}
                tasks={taskState.tasks}
                projects={projectState.projects}
                counts={taskState.counts}
                loading={taskState.loading}
                error={taskState.error}
                onReload={() => void taskState.reload()}
                onCreate={taskState.createTask}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onProcessInbox={() => setProcessing(true)}
                quickAddRef={quickAddRef}
              />

              <div className="flex flex-col gap-6 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                <ProjectList
                  projects={projectState.projects}
                  tasksByProject={tasksByProject}
                  loading={projectState.loading}
                  selectedId={undefined}
                  onSelect={(project) => setView({ kind: 'project', id: project.id })}
                  onCreate={() => {
                    setEditing(undefined)
                    setFormOpen(true)
                  }}
                  onEdit={(project) => {
                    setEditing(project)
                    setFormOpen(true)
                  }}
                  onChangeStatus={(project, next) => void changeProjectStatus(project, next)}
                  onDelete={setDeleting}
                />

                <aside aria-labelledby="gtd-tip" className="rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/5">
                  <h2 id="gtd-tip" className="text-sm font-semibold">
                    The two-minute rule
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    If processing an inbox item takes less than two minutes, just do it. Otherwise decide the very next
                    physical action.
                  </p>
                </aside>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <p>Clearspace · Getting Things Done, calmly.</p>
        <p className="inline-flex items-center gap-1">
          Press <kbd className="rounded-sm bg-muted px-1 font-sans">?</kbd> for shortcuts
        </p>
      </footer>

      <InboxProcessor
        open={processing}
        onOpenChange={setProcessing}
        tasks={taskState.tasks}
        projects={projectState.projects.filter((project) => project.status !== 'archive')}
        onUpdate={updateTask}
        onDone={() => {
          setProcessing(false)
          setStatus('inbox')
        }}
      />
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editing}
        onCreate={projectState.createProject}
        onUpdate={projectState.updateProject}
      />
      <DeleteProjectDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        project={deleting}
        onDelete={async (id) => {
          await projectState.deleteProject(id)
          if (view.kind === 'project' && view.id === id) setView({ kind: 'board' })
        }}
      />
    </AppShell>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Workspace />
      <Toaster position="bottom-right" closeButton richColors />
    </ThemeProvider>
  )
}

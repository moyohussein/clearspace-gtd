import * as React from 'react'
import { ArrowRight, Check, Clock, FolderInput, Inbox, Sparkles } from 'lucide-react'
import type { Project, Task } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Kbd } from '@/components/ui/kbd'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: Task[]
  projects: Project[]
  onUpdate: (id: string, patch: Partial<Pick<Task, 'title' | 'status' | 'project_id'>>) => Promise<unknown>
  onDone: () => void
}

export function InboxProcessor({ open, onOpenChange, tasks, projects, onUpdate, onDone }: Props) {
  const inbox = React.useMemo(() => tasks.filter((task) => task.status === 'inbox'), [tasks])
  const [handled, setHandled] = React.useState<string[]>([])
  

  // Hidden immediately after a decision; the save runs in the background.
  const queue = inbox.filter((task) => !handled.includes(task.id))
  const current = queue[0]

  // Reset the queue each time the dialog opens (not on every task refresh).
  const wasOpen = React.useRef(open)
  React.useEffect(() => {
    if (open && !wasOpen.current) setHandled([])
    wasOpen.current = open
  }, [open])

  // Functional updates queue in order, so a fast decision can't clobber the previous one.
  const advance = React.useCallback((id: string) => {
    setHandled((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  // Serialise decisions: the next update can only leave after the previous save
  // finished, so a quick second key never races the first PATCH.
  const chain = React.useRef<Promise<void>>(Promise.resolve())

  const decide = React.useCallback(
    (status: 'done' | 'next' | 'waiting') => {
      if (!current) return
      const task = current
      // Local decision first: the panel must never show a busy state where the
      // next keypress is silently dropped.
      advance(task.id)
      chain.current = chain.current.then(async () => {
        try {
          await onUpdate(task.id, { status })
          toast.success(`Moved to ${status}`, { description: task.title })
        } catch {
          // The board already rolled back and toasted; put the item back in the queue.
          setHandled((prev) => prev.filter((id) => id !== task.id))
        } finally {
          dialogRef.current?.focus()
        }
      })
    },
    [advance, current, onUpdate],
  )

  const assign = React.useCallback(
    (project: Project) => {
      if (!current) return
      const task = current
      advance(task.id)
      chain.current = chain.current.then(async () => {
        try {
          await onUpdate(task.id, { project_id: project.id, status: 'next' })
          toast.success(`Assigned to ${project.name}`, { description: `${task.title} → Next` })
        } catch {
          setHandled((prev) => prev.filter((id) => id !== task.id))
        } finally {
          dialogRef.current?.focus()
        }
      })
    },
    [advance, current, onUpdate],
  )

  // Read the latest state through a ref: re-running the effect after every decision
  // would lose keypresses that land between teardown and re-attach.
  const latest = React.useRef({ current, projects, decide, assign })
  latest.current = { current, projects, decide, assign }

  React.useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      const { current, projects, decide, assign } = latest.current
      const target = event.target as HTMLElement | null
      // Only real text entry swallows shortcuts; the dialog's own focusable panel has role="dialog".
      const typing = Boolean(target?.closest('input, textarea, [contenteditable="true"], [role="combobox"]'))
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return

      const key = event.key.toLowerCase()
      if (key === 'd') {
        event.preventDefault()
        decide('done')
      } else if (key === 'w') {
        event.preventDefault()
        decide('waiting')
      } else if (key === 'x') {
        event.preventDefault()
        decide('next')
      } else if (key === 'p') {
        event.preventDefault()
        if (!current) return
        if (projects.length === 0) toast.error('Create a project first to assign tasks')
        else if (projects.length === 1) assign(projects[0])
      } else if (event.key === 'ArrowRight' && current) {
        event.preventDefault()
        // Advance immediately with the id in hand; queueing a second update keeps
        // the skip ordered even if a decision is still in flight.
        setHandled((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]))
        toast.message('Skipped for now', { description: current.title })
      }
    }
    // Capture phase: Base UI's dialog wrapper stops some keys (e.g. ArrowRight)
    // before they reach the window bubble phase.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  // Focus lives on the dialog itself, never on a button that is about to unmount:
  // removing the focused element drops focus to <body> and kills the shortcuts.
  const dialogRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => dialogRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [current?.id, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        className="gap-5 sm:max-w-lg"
        data-testid="inbox-processor"
        ref={dialogRef}
        tabIndex={-1}
        // Keep clicks inside the panel from dropping focus to <body> (which would
        // disable the keyboard shortcuts until the user clicks again).
        onPointerDownCapture={(event) => {
          const target = event.target as HTMLElement
          if (target.closest('input, textarea, button, [role="combobox"], [role="menuitem"]')) return
          requestAnimationFrame(() => dialogRef.current?.focus())
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="size-4" aria-hidden="true" />
            Process inbox
          </DialogTitle>
          <DialogDescription>
            Decide one item at a time: do it, defer it, or give it a home. {queue.length} left.
          </DialogDescription>
        </DialogHeader>

        {current ? (
          <>
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-base leading-snug font-medium text-pretty" data-testid="current-inbox-task">
                {current.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Item {handled.length + 1} of {handled.length + queue.length}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="inbox-project" className="text-xs font-medium text-muted-foreground">
                Assign to project
              </label>
              <Select
                value=""
                disabled={projects.length === 0}
                onValueChange={(value) => {
                  const project = projects.find((option) => option.id === value)
                  if (project) assign(project)
                }}
              >
                <SelectTrigger id="inbox-project" className="w-full" aria-label="Assign to project">
                  <SelectValue placeholder={projects.length ? 'Choose a project…' : 'No projects yet'} />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <FolderInput aria-hidden="true" />
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Done', key: 'd', icon: Check, action: () => void decide('done'), testId: 'process-done' },
                { label: 'Waiting', key: 'w', icon: Clock, action: () => void decide('waiting'), testId: 'process-waiting' },
                { label: 'Next', key: 'x', icon: ArrowRight, action: () => void decide('next'), testId: 'process-next' },
              ].map((option, index) => (
                <Button
                  key={option.label}
                  variant={option.label === 'Done' ? 'success' : 'outline'}
                  className="h-auto flex-col gap-1 py-2.5"
                  data-testid={option.testId}
                  onClick={option.action}
                  aria-keyshortcuts={option.key}
                >
                  <option.icon className="size-4" aria-hidden="true" />
                  {option.label}
                  <Kbd>{option.key}</Kbd>
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Kbd>p</Kbd> project · <Kbd>→</Kbd> skip
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  advance(current.id)
                  toast.message('Skipped for now')
                }}
              >
                Skip item
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </Button>
            </div>
          </>
        ) : (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-success/10 text-success">
                <Sparkles aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{inbox.length ? 'Inbox handled' : 'Inbox is empty'}</EmptyTitle>
              <EmptyDescription>
                {inbox.length
                  ? 'Every captured item has a next move. Keep the streak going.'
                  : 'Capture a thought and it will appear here to process.'}
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={onDone}>Back to the board</Button>
          </Empty>
        )}
      </DialogContent>
    </Dialog>
  )
}

import * as React from 'react'
import { Check, HelpCircle, Inbox, Moon, Plus, Sun } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { useTheme } from '@/lib/theme'
import { cn } from 'cn'

export type View = 'board' | 'project'

export function AppShell({
  children,
  counts,
  inboxCount,
  view,
  onNavigateBoard,
  onNewTask,
  onOpenHelp,
}: {
  children: React.ReactNode
  counts: { inbox: number; next: number; waiting: number; done: number }
  inboxCount: number
  view: View
  onNavigateBoard: () => void
  onNewTask: () => void
  onOpenHelp: () => void
}) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-svh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={onNavigateBoard}
            className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label="Clearspace home"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Check className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Clearspace</span>
          </button>

          <nav aria-label="Primary" className="ml-1 hidden items-center sm:flex">
            <Button
              variant={view === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={onNavigateBoard}
              aria-current={view === 'board' ? 'page' : undefined}
            >
              Workspace
            </Button>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Badge variant="outline" className="hidden h-7 gap-1 px-2 text-xs font-normal sm:inline-flex">
              <Inbox className="size-3" aria-hidden="true" />
              <span className="tabular-nums">{counts.inbox}</span> in inbox
            </Badge>

            <Button variant="ghost" size="icon-sm" onClick={onOpenHelp} aria-label="Keyboard shortcuts" aria-keyshortcuts="?">
              <HelpCircle aria-hidden="true" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </Button>

            <Button size="sm" onClick={onNewTask} aria-keyshortcuts="n">
              <Plus aria-hidden="true" data-icon="inline-start" />
              <span className="hidden xs:inline sm:inline">New task</span>
              <KbdGroup className="ml-1 hidden md:inline-flex">
                <Kbd>n</Kbd>
              </KbdGroup>
            </Button>
          </div>
        </div>
        {inboxCount > 0 && (
          <div className="h-0.5 w-full bg-muted" aria-hidden="true">
            <div
              className={cn('h-full bg-primary transition-[width] duration-500')}
              style={{ width: `${Math.min(100, Math.max(6, (counts.inbox / Math.max(1, inboxCount)) * 100))}%` }}
            />
          </div>
        )}
      </header>

      {children}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  counts,
  children,
}: {
  title: string
  description: string
  counts: { inbox: number; next: number; waiting: number; done: number }
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{title}</h1>
        <p className="max-w-prose text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Task counts by status">
        {(
          [
            ['inbox', 'Inbox'],
            ['next', 'Next'],
            ['waiting', 'Waiting'],
            ['done', 'Done'],
          ] as const
        ).map(([status, label]) => (
          <div key={status} className="flex items-baseline gap-1.5 rounded-lg bg-card px-3 py-2 ring-1 ring-foreground/10">
            <dd className="text-lg leading-none font-semibold tabular-nums">{counts[status]}</dd>
            <dt className="text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>
      {children}
    </div>
  )
}

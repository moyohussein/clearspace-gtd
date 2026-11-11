import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'

const groups = [
  {
    title: 'Anywhere',
    shortcuts: [
      { keys: ['n'], label: 'New task' },
      { keys: ['?'], label: 'Open this help' },
      { keys: ['Esc'], label: 'Close dialogs' },
    ],
  },
  {
    title: 'Inbox processing',
    shortcuts: [
      { keys: ['d'], label: 'Mark done' },
      { keys: ['w'], label: 'Defer to Waiting' },
      { keys: ['x'], label: 'Move to Next' },
      { keys: ['p'], label: 'Assign to a project' },
      { keys: ['→'], label: 'Skip to next item' },
    ],
  },
]

export function ShortcutHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move through your day without reaching for the mouse.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          {groups.map((group) => (
            <section key={group.title} aria-labelledby={`shortcuts-${group.title}`}>
              <h3 id={`shortcuts-${group.title}`} className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.title}
              </h3>
              <dl className="flex flex-col gap-2">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.label} className="flex items-center justify-between gap-3 text-sm">
                    <dt>{shortcut.label}</dt>
                    <dd className="flex gap-1">
                      {shortcut.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

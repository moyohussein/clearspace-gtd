import * as React from 'react'
import { CornerDownLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'

type QuickAddProps = {
  onAdd: (title: string) => Promise<unknown>
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function QuickAdd({ onAdd, inputRef }: QuickAddProps) {
  const [title, setTitle] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const localRef = React.useRef<HTMLInputElement>(null)
  const ref = inputRef ?? localRef

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const value = title.trim()
    if (!value) {
      setError('Give the task a title first')
      ref.current?.focus()
      return
    }
    if (value.length > 200) {
      setError('Keep the title under 200 characters')
      return
    }
    setSaving(true)
    try {
      await onAdd(value)
      setTitle('')
      setError(null)
    } catch {
      // The task hook shows the failure toast; keep the text so it can be retried.
    } finally {
      setSaving(false)
      // Capture stays fast: focus returns to the input after every submit.
      ref.current?.focus()
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Quick add task">
      <label htmlFor="quick-add" className="sr-only">
        New task title
      </label>
      <InputGroup className="h-11 bg-card shadow-xs">
        <InputGroupAddon>
          <Plus aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          id="quick-add"
          ref={ref}
          value={title}
          placeholder="What's on your mind? Capture it here…"
          autoComplete="off"
          maxLength={201}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'quick-add-error' : 'quick-add-hint'}
          onChange={(event) => {
            setTitle(event.target.value)
            setError(null)
          }}
        />
        <InputGroupAddon align="inline-end" className="gap-1.5">
          <Kbd className="hidden sm:inline-flex">n</Kbd>
          <InputGroupButton type="submit" variant="default" size="sm" disabled={saving}>
            {saving ? 'Adding…' : 'Add'}
            <CornerDownLeft aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {error ? (
        <p id="quick-add-error" role="alert" className="mt-1.5 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : (
        <p id="quick-add-hint" className="mt-1.5 text-xs text-muted-foreground">
          New tasks land in your Inbox. Press <Kbd>n</Kbd> anywhere to jump back here.
        </p>
      )}
    </form>
  )
}

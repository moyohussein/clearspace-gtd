import { expect, test } from '@playwright/test'
import { createProject, createTask, resetWorkspace, tabs, taskRow } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await resetWorkspace(page)
  await page.reload()
})

test('creates a task from quick-add, keeps focus, and persists across reload', async ({ page }) => {
  const input = page.getByLabel('New task title')
  await input.fill('Plan the weekend hike')
  await input.press('Enter')

  await expect(input).toHaveValue('')
  await expect(input).toBeFocused()
  await expect(taskRow(page, 'Plan the weekend hike')).toBeVisible()
  await expect(page.getByRole('tab', { name: /Inbox/ })).toContainText('1')

  await page.reload()
  await expect(taskRow(page, 'Plan the weekend hike')).toBeVisible()
})

test('validates an empty quick-add submission', async ({ page }) => {
  const input = page.getByLabel('New task title')
  await input.fill('   ')
  await input.press('Enter')
  await expect(page.getByRole('alert').filter({ hasText: 'Give the task a title first' })).toBeVisible()
  await expect(input).toBeFocused()
})

test('filters tasks by status and shows counts in the header', async ({ page }) => {
  const next = await createTask(page, 'Draft the launch email')
  const waiting = await createTask(page, 'Waiting on venue quote')
  await page.request.patch(`/tasks/${next.id}`, { data: { status: 'next' } })
  await page.request.patch(`/tasks/${waiting.id}`, { data: { status: 'waiting' } })
  await page.reload()

  await expect(page.getByRole('tab', { name: /Next/ })).toContainText('1')
  await expect(page.getByRole('tab', { name: /Waiting/ })).toContainText('1')

  await tabs(page).getByRole('tab', { name: /Waiting/ }).click()
  await expect(taskRow(page, 'Waiting on venue quote')).toBeVisible()
  await expect(taskRow(page, 'Draft the launch email')).toHaveCount(0)

  await tabs(page).getByRole('tab', { name: /Next/ }).click()
  await expect(taskRow(page, 'Draft the launch email')).toBeVisible()
  await expect(taskRow(page, 'Waiting on venue quote')).toHaveCount(0)
})

test('completes a task with one click and persists it', async ({ page }) => {
  const task = await createTask(page, 'Return the library books')
  await page.reload()

  await taskRow(page, 'Return the library books').getByRole('button', { name: /^Complete/ }).click()
  await expect(taskRow(page, 'Return the library books')).toHaveCount(0)

  await tabs(page).getByRole('tab', { name: /Done/ }).click()
  await expect(taskRow(page, 'Return the library books')).toBeVisible()

  await page.reload()
  await tabs(page).getByRole('tab', { name: /Done/ }).click()
  await expect(taskRow(page, 'Return the library books')).toBeVisible()

  const stored = await (await page.request.get(`/tasks/${task.id}`)).json()
  expect(stored.task.status).toBe('done')
})

test('edits a title, changes status and assigns a project', async ({ page }) => {
  const project = await createProject(page, 'Kitchen refresh')
  await createTask(page, 'Old title')
  await page.reload()

  const row = taskRow(page, 'Old title')
  await row.getByRole('button', { name: /Edit "Old title"/ }).click()
  const editor = page.getByTestId('task-item').getByLabel('Task title')
  await expect(editor).toBeFocused()
  await editor.fill('New title')
  await editor.press('Enter')
  await expect(taskRow(page, 'New title')).toBeVisible()

  await taskRow(page, 'New title').getByRole('button', { name: /Actions for/ }).click()
  await page.getByRole('menuitem', { name: 'Waiting' }).click()
  await expect(taskRow(page, 'New title')).toHaveCount(0)

  await tabs(page).getByRole('tab', { name: /Waiting/ }).click()
  await taskRow(page, 'New title').getByRole('combobox', { name: /Project for/ }).click()
  await page.getByRole('option', { name: project.name }).click()
  await expect(taskRow(page, 'New title')).toContainText(project.name)

  await page.reload()
  await tabs(page).getByRole('tab', { name: /Waiting/ }).click()
  await expect(taskRow(page, 'New title')).toContainText(project.name)
})

test('deletes a task', async ({ page }) => {
  await createTask(page, 'Temporary task')
  await page.reload()

  await taskRow(page, 'Temporary task').getByRole('button', { name: /Actions for/ }).click()
  await page.getByRole('menuitem', { name: 'Delete task' }).click()
  await expect(taskRow(page, 'Temporary task')).toHaveCount(0)

  const { tasks } = await (await page.request.get('/tasks')).json()
  expect(tasks.some((task: { title: string }) => task.title === 'Temporary task')).toBe(false)
})

test('rolls a failed optimistic change back and reports it', async ({ page }) => {
  await createTask(page, 'Keep me')
  await page.reload()

  await page.route('**/tasks/*', (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom' }) })
      : route.continue(),
  )

  await taskRow(page, 'Keep me').getByRole('button', { name: /^Complete/ }).click()
  await expect(page.getByText('Change not saved')).toBeVisible()
  await expect(taskRow(page, 'Keep me')).toBeVisible()
  await expect(taskRow(page, 'Keep me').getByRole('button', { name: /^Complete/ })).toBeVisible()
})

test('opens the shortcut help panel with ?', async ({ page }) => {
  await page.keyboard.press('?')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Keyboard shortcuts')).toBeVisible()
  await expect(dialog.getByText('Inbox processing')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

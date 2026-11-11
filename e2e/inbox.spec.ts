import { expect, test } from '@playwright/test'
import { createProject, createTask, resetWorkspace, tabs, taskRow } from './helpers'

test('processes the inbox item by item with the keyboard', async ({ page }) => {
  await page.goto('/')
  await resetWorkspace(page)

  const project = await createProject(page, 'Garden planning')
  await createTask(page, 'Order the seed tray')
  await createTask(page, 'Call the allotment office')
  await createTask(page, 'Sketch the raised bed layout')

  await page.reload()
  await page.getByRole('button', { name: 'Process inbox' }).click()
  const dialog = page.getByTestId('inbox-processor')
  await expect(dialog).toBeVisible()

  // Items come newest-first, so this run starts on the last capture.
  const current = dialog.getByTestId('current-inbox-task')
  await expect(current).toHaveText('Sketch the raised bed layout')
  const taskByTitle = async (title: string) => {
    const response = await page.request.get('/tasks', { headers: { 'cache-control': 'no-cache' } })
    return (await response.json()).tasks.find((task: { title: string }) => task.title === title)
  }
  // One decision at a time: after each key the row must change and the task must
  // leave the inbox. Polling the queue keeps the assertion meaningful even when
  // the optimistic state already matches.
  await page.keyboard.press('d')
  await expect.poll(async () => (await taskByTitle('Sketch the raised bed layout')).status, { timeout: 15_000 }).toBe('done')
  await expect(current).toHaveText('Call the allotment office', { timeout: 15_000 })

  await page.keyboard.press('w')
  await expect.poll(async () => (await taskByTitle('Call the allotment office')).status, { timeout: 15_000 }).toBe('waiting')
  await expect(current).toHaveText('Order the seed tray', { timeout: 15_000 })

  await page.keyboard.press('p')
  await expect.poll(async () => (await taskByTitle('Order the seed tray')).status, { timeout: 15_000 }).toBe('next')
  await expect(current).toHaveCount(0, { timeout: 15_000 })

  await dialog.getByRole('button', { name: 'Back to the board' }).click()

  expect(await taskByTitle('Sketch the raised bed layout')).toMatchObject({ status: 'done' })
  expect(await taskByTitle('Call the allotment office')).toMatchObject({ status: 'waiting' })
  expect(await taskByTitle('Order the seed tray')).toMatchObject({ status: 'next', project_id: project.id })

  await tabs(page).getByRole('tab', { name: /Next/ }).click()
  await expect(taskRow(page, 'Order the seed tray')).toContainText('Garden planning')
})

test('skips an item with → and handles a project in the dialog', async ({ page }) => {
  await page.goto('/')
  await resetWorkspace(page)
  await createProject(page, 'Studio setup')
  await createTask(page, 'First item')
  await createTask(page, 'Second item')
  await page.reload()

  await page.getByRole('button', { name: 'Process inbox' }).click()
  const dialog = page.getByTestId('inbox-processor')
  const current = dialog.getByTestId('current-inbox-task')
  await expect(current).toHaveText('Second item')
  await page.waitForTimeout(300)
  await page.keyboard.press('ArrowRight')
  await expect(current).toHaveText('First item', { timeout: 15_000 })

  await page.keyboard.press('x')
  await expect(current).toHaveCount(0, { timeout: 15_000 })

  const { tasks } = await (await page.request.get('/tasks')).json()
  expect(tasks.find((task: { title: string }) => task.title === 'First item').status).toBe('next')
  expect(tasks.find((task: { title: string }) => task.title === 'Second item').status).toBe('inbox')
})

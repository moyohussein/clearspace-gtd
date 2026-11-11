import { expect, test } from '@playwright/test'
import { createTask, taskRow } from './helpers'

test('renders the seeded workspace, filters and captures with keyboard', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your mind, cleared.' })).toBeVisible()

  // Other specs clean the board, so this one seeds its own task rather than
  // depending on leftover rows.
  const seeded = await createTask(page, 'Smoke test from Playwright')
  await page.reload()

  const tabs = page.getByRole('tablist', { name: 'Filter tasks by status' })
  await expect(tabs.getByRole('tab', { name: /Inbox/ })).toBeVisible()
  await expect(taskRow(page, seeded.title)).toBeVisible()

  await page.screenshot({ path: 'test-results/light-board.png', fullPage: true })

  await tabs.getByRole('tab', { name: /Done/ }).click()
  await expect(page.getByRole('heading', { name: /Projects/i }).first()).toBeVisible()

  await page.keyboard.press('n')
  const quickAdd = page.getByLabel('New task title')
  await expect(quickAdd).toBeFocused()
  await quickAdd.fill('Captured with the keyboard')
  await quickAdd.press('Enter')
  await expect(quickAdd).toHaveValue('')
  await expect(quickAdd).toBeFocused()

  await tabs.getByRole('tab', { name: /Inbox/ }).click()
  await expect(page.getByText('Captured with the keyboard')).toBeVisible()

  await page.keyboard.press('?')
  await expect(page.getByRole('dialog').getByText('Keyboard shortcuts')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.screenshot({ path: 'test-results/dark-board.png', fullPage: true })

  expect(errors).toEqual([])
})

import { expect, test } from '@playwright/test'
import { createProject, createTask, projectItem, resetWorkspace } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await resetWorkspace(page)
  await page.reload()
})

test('creates a project, renames it and changes its status', async ({ page }) => {
  await page.getByRole('button', { name: 'New project' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Project name').fill('Garden planning')
  await dialog.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const item = projectItem(page, 'Garden planning')
  await expect(item).toBeVisible()

  await item.getByRole('button', { name: /Actions for project/ }).click()
  await page.getByRole('menuitem', { name: 'Rename project' }).click()
  const editor = page.getByRole('dialog')
  await editor.getByLabel('Project name').fill('Front garden planning')
  await editor.getByRole('button', { name: 'Save changes' }).click()
  await expect(projectItem(page, 'Front garden planning')).toBeVisible()

  await projectItem(page, 'Front garden planning')
    .getByRole('button', { name: /Actions for project/ })
    .click()
  await page.getByRole('menuitem', { name: 'Someday', exact: true }).click()
  await expect(projectItem(page, 'Front garden planning')).toContainText('Someday')

  await page.reload()
  await expect(projectItem(page, 'Front garden planning')).toContainText('Someday')
})

test('validates the project name', async ({ page }) => {
  await page.getByRole('button', { name: 'New project' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Create project' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Project name is required')
  await expect(dialog.getByLabel('Project name')).toBeFocused()
})

test('shows only that project’s tasks in the project view', async ({ page }) => {
  const project = await createProject(page, 'Garden planning')
  const task = await createTask(page, 'Buy compost')
  await createTask(page, 'Unrelated task')
  await page.request.patch(`/tasks/${task.id}`, { data: { project_id: project.id } })
  await page.reload()

  await projectItem(page, 'Garden planning').getByRole('button', { name: /Garden planning/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Garden planning' })).toBeVisible()
  await expect(page.getByText('Buy compost')).toBeVisible()
  await expect(page.getByText('Unrelated task')).toHaveCount(0)

  await page.getByRole('button', { name: 'All projects' }).click()
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
})

test('won’t delete a project with tasks until the blocking tasks are listed', async ({ page }) => {
  const project = await createProject(page, 'Garden planning')
  const task = await createTask(page, 'Buy compost')
  await page.request.patch(`/tasks/${task.id}`, { data: { project_id: project.id } })
  await page.reload()

  const item = projectItem(page, 'Garden planning')
  await item.getByRole('button', { name: /Actions for project/ }).click()
  await page.getByRole('menuitem', { name: 'Delete project' }).click()

  const dialog = page.getByRole('dialog')
  // The dialog pre-flights the delete and lists whatever the API reports as blocking.
  await expect(dialog.getByText(/still has|Can’t delete/)).toBeVisible()
  await expect(dialog.getByText('Buy compost')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Delete project' })).toHaveCount(0)

  await dialog.getByRole('button', { name: 'Close' }).first().click()
  await expect(projectItem(page, 'Garden planning')).toBeVisible()
})

test('deletes an empty project', async ({ page }) => {
  await createProject(page, 'Temporary project')
  await page.reload()

  const item = projectItem(page, 'Temporary project')
  await item.getByRole('button', { name: /Actions for project/ }).click()
  await page.getByRole('menuitem', { name: 'Delete project' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Delete project?')).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete project' }).click()

  await expect(projectItem(page, 'Temporary project')).toHaveCount(0)
  await page.reload()
  await expect(projectItem(page, 'Temporary project')).toHaveCount(0)
})

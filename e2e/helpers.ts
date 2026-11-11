import { expect, type Page } from '@playwright/test'

// Each test starts from a clean board: remove tasks/projects created by earlier runs.
export async function resetWorkspace(page: Page) {
  const [tasks, projects] = await Promise.all([
    page.request.get('/tasks').then((r) => r.json() as Promise<{ tasks: { id: string }[] }>),
    page.request.get('/projects').then((r) => r.json() as Promise<{ projects: { id: string }[] }>),
  ])
  for (const task of tasks.tasks) await page.request.delete(`/tasks/${task.id}`)
  for (const project of projects.projects) await page.request.delete(`/projects/${project.id}`)
}

export async function createTask(page: Page, title: string) {
  const response = await page.request.post('/tasks', { data: { title } })
  expect(response.status()).toBe(201)
  return (await response.json()).task as { id: string; title: string }
}

export async function createProject(page: Page, name: string) {
  const response = await page.request.post('/projects', { data: { name } })
  expect(response.status()).toBe(201)
  return (await response.json()).project as { id: string; name: string }
}

export const tabs = (page: Page) => page.getByRole('tablist', { name: 'Filter tasks by status' })
export const taskRow = (page: Page, title: string) => page.getByTestId('task-item').filter({ hasText: title })

export const projectItem = (page: Page, name: string) => page.getByTestId('project-item').filter({ hasText: name })

import { env, exports } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'
import type { ApiError, Project, Task } from '../../shared/types'
import type { Env } from '../../worker'

const json = (body: unknown) => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

beforeAll(async () => {
  await env.DB.prepare("DELETE FROM tasks WHERE id NOT LIKE 'task-%'").run()
  await env.DB.prepare("DELETE FROM projects WHERE id NOT LIKE 'project-%'").run()
})

async function createProject(name: string, status: 'active' | 'someday' | 'archive' = 'active') {
  const response = await exports.default.fetch('https://gtd.test/projects', {
    method: 'POST',
    ...json({ name, status }),
  })
  expect(response.status).toBe(201)
  return ((await response.json()) as { project: Project }).project
}

async function createTaskIn(projectId: string, title: string) {
  const response = await exports.default.fetch('https://gtd.test/tasks', {
    method: 'POST',
    ...json({ title, project_id: projectId }),
  })
  return ((await response.json()) as { task: Task }).task
}

describe('project API contract', () => {
  it('lists seeded projects', async () => {
    const response = await exports.default.fetch('https://gtd.test/projects')
    expect(response.status).toBe(200)
    const { projects } = (await response.json()) as { projects: Project[] }
    expect(projects.length).toBeGreaterThanOrEqual(3)
  })

  it('creates, renames and changes status', async () => {
    const project = await createProject('New studio')
    expect(project).toMatchObject({ name: 'New studio', status: 'active' })

    const rename = await exports.default.fetch(`https://gtd.test/projects/${project.id}`, {
      method: 'PATCH',
      ...json({ name: 'New studio build' }),
    })
    expect(rename.status).toBe(200)
    expect(((await rename.json()) as { project: Project }).project.name).toBe('New studio build')

    const archive = await exports.default.fetch(`https://gtd.test/projects/${project.id}`, {
      method: 'PATCH',
      ...json({ status: 'archive' }),
    })
    expect(((await archive.json()) as { project: Project }).project).toMatchObject({
      name: 'New studio build',
      status: 'archive',
    })
  })

  it('validates project payloads with 400', async () => {
    const blank = await exports.default.fetch('https://gtd.test/projects', { method: 'POST', ...json({ name: ' ' }) })
    expect(blank.status).toBe(400)
    expect(((await blank.json()) as ApiError).message).toContain('Name is required')

    const project = await createProject('Validate project')
    const badStatus = await exports.default.fetch(`https://gtd.test/projects/${project.id}`, {
      method: 'PATCH',
      ...json({ status: 'paused' }),
    })
    expect(badStatus.status).toBe(400)
    expect(((await badStatus.json()) as ApiError).message).toContain('Status must be one of')

    const unknown = await exports.default.fetch(`https://gtd.test/projects/${project.id}`, {
      method: 'PATCH',
      ...json({ name: 'x' }),
    })
    expect(unknown.status).toBe(200)
    expect((await exports.default.fetch('https://gtd.test/projects/nope', { method: 'DELETE' })).status).toBe(404)
  })

  it('refuses to delete a project with tasks, naming the blocking tasks', async () => {
    const project = await createProject('Has tasks')
    const one = await createTaskIn(project.id, 'Blocker one')
    const two = await createTaskIn(project.id, 'Blocker two')

    const response = await exports.default.fetch(`https://gtd.test/projects/${project.id}`, { method: 'DELETE' })
    expect(response.status).toBe(409)
    const body = (await response.json()) as ApiError
    expect(body.blocking_tasks?.map((t) => t.id).sort()).toEqual([one.id, two.id].sort())
    expect(body.blocking_tasks?.map((t) => t.title).sort()).toEqual(['Blocker one', 'Blocker two'])
    expect(body.message).toContain('2 tasks')

    const stillThere = (await (
      await exports.default.fetch(`https://gtd.test/tasks?status=inbox`)
    ).json()) as { tasks: Task[] }
    expect(stillThere.tasks.filter((t) => t.project_id === project.id)).toHaveLength(2)
  })

  it('deletes an empty project', async () => {
    const project = await createProject('Empty project')
    const response = await exports.default.fetch(`https://gtd.test/projects/${project.id}`, { method: 'DELETE' })
    expect(response.status).toBe(204)
    const { projects } = (await (await exports.default.fetch('https://gtd.test/projects')).json()) as {
      projects: Project[]
    }
    expect(projects.some((p) => p.id === project.id)).toBe(false)
  })
})

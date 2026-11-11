import { env, exports } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'
import type { ApiError, Task } from '../../shared/types'
import type { Env } from '../../worker'

const post = (body: unknown) =>
  exports.default.fetch('https://gtd.test/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeAll(async () => {
  // Tests share one D1 instance; clear task writes from this suite only.
  await env.DB.prepare("DELETE FROM tasks WHERE id NOT LIKE 'task-%'").run()
})

describe('task API contract', () => {
  it('POST /tasks creates an inbox task with 201', async () => {
    const response = await post({ title: 'Write the quarterly review' })
    expect(response.status).toBe(201)
    const { task } = (await response.json()) as { task: Task }
    expect(task).toMatchObject({ title: 'Write the quarterly review', status: 'inbox', project_id: null })
    expect(task.id).toBeTruthy()
    expect(task.created_at).toBe(task.updated_at)
  })

  it('GET /tasks?status=inbox filters and returns 200', async () => {
    const response = await exports.default.fetch('https://gtd.test/tasks?status=inbox')
    expect(response.status).toBe(200)
    const { tasks } = (await response.json()) as { tasks: Task[] }
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks.every((t) => t.status === 'inbox')).toBe(true)
  })

  it('GET /tasks rejects an unknown status filter with 400', async () => {
    const response = await exports.default.fetch('https://gtd.test/tasks?status=later')
    expect(response.status).toBe(400)
    expect(((await response.json()) as ApiError).message).toContain('Status must be one of')
  })

  it('GET /tasks/{unknown} returns 404', async () => {
    const response = await exports.default.fetch('https://gtd.test/tasks/unknown-id')
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Task not found' })
  })

  it('PATCH rejects invalid status with 400 and leaves the task alone', async () => {
    const { task } = (await (await post({ title: 'Keep me intact' })).json()) as { task: Task }
    const response = await exports.default.fetch(`https://gtd.test/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'someday' }),
    })
    expect(response.status).toBe(400)
    expect(((await response.json()) as ApiError).message).toContain('Status must be one of')

    const after = (await (await exports.default.fetch(`https://gtd.test/tasks/${task.id}`)).json()) as { task: Task }
    expect(after.task.status).toBe('inbox')
  })

  it('PATCH rejects an empty body and blank titles with 400', async () => {
    const { task } = (await (await post({ title: 'Validate me' })).json()) as { task: Task }
    const patch = (body: unknown) =>
      exports.default.fetch(`https://gtd.test/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    expect((await patch({})).status).toBe(400)
    const blank = await patch({ title: '   ' })
    expect(blank.status).toBe(400)
    expect(((await blank.json()) as ApiError).message).toContain('Title is required')
    expect((await post({})).status).toBe(400)
  })

  it('PATCH to done returns 200 with the full updated task', async () => {
    const { task } = (await (await post({ title: 'Finish the report' })).json()) as { task: Task }
    const response = await exports.default.fetch(`https://gtd.test/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done', title: 'Finish the report today' }),
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { task: Task }
    expect(body.task).toMatchObject({
      id: task.id,
      title: 'Finish the report today',
      status: 'done',
      project_id: null,
      created_at: task.created_at,
    })
    expect(body.task.updated_at >= task.updated_at).toBe(true)
  })

  it('PATCH accepts a project assignment and rejects unknown projects', async () => {
    const { task } = (await (await post({ title: 'Assign me' })).json()) as { task: Task }
    const patch = (body: unknown) =>
      exports.default.fetch(`https://gtd.test/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    const assigned = await patch({ project_id: 'project-home' })
    expect(assigned.status).toBe(200)
    expect(((await assigned.json()) as { task: Task }).task.project_id).toBe('project-home')
    expect((await patch({ project_id: 'project-missing' })).status).toBe(400)
    const cleared = await patch({ project_id: null })
    expect(((await cleared.json()) as { task: Task }).task.project_id).toBeNull()
  })

  it('DELETE removes the task and returns 404 on unknown ids', async () => {
    const { task } = (await (await post({ title: 'Delete me' })).json()) as { task: Task }
    const response = await exports.default.fetch(`https://gtd.test/tasks/${task.id}`, { method: 'DELETE' })
    expect(response.status).toBe(204)
    expect((await exports.default.fetch(`https://gtd.test/tasks/${task.id}`)).status).toBe(404)
    expect((await exports.default.fetch(`https://gtd.test/tasks/${task.id}`, { method: 'DELETE' })).status).toBe(404)
  })
})

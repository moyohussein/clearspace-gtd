import { Hono } from 'hono'
import type { Project, Task, TaskStatus } from '../shared/types'
import { projectRoutes } from './projects'
import { jsonValidator, queryValidator, taskCreateSchema, taskPatchSchema, taskQuerySchema } from './validation'

export interface Env {
  DB: D1Database
}

export const taskRoutes = new Hono<{ Bindings: Env }>()

const now = () => new Date().toISOString()

const projectExists = (db: D1Database, id: string) =>
  db.prepare('SELECT id FROM projects WHERE id = ?').bind(id).first<Project>()

taskRoutes.get('/', queryValidator(taskQuerySchema), async (c) => {
  const { status } = c.req.valid('query')
  const query = status
    ? c.env.DB.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC').bind(status)
    : c.env.DB.prepare('SELECT * FROM tasks ORDER BY created_at DESC')
  const { results } = await query.all<Task>()
  return c.json({ tasks: results })
})

taskRoutes.post('/', jsonValidator(taskCreateSchema), async (c) => {
  const body = c.req.valid('json')
  if (body.project_id && !(await projectExists(c.env.DB, body.project_id))) {
    return c.json({ error: 'Project not found' }, 400)
  }
  const timestamp = now()
  // New captures always start in the inbox, whatever the client asked for.
  const task: Task = {
    id: crypto.randomUUID(),
    title: body.title,
    status: 'inbox',
    project_id: body.project_id ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  }
  await c.env.DB.prepare(
    'INSERT INTO tasks (id, title, status, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(task.id, task.title, task.status, task.project_id, task.created_at, task.updated_at)
    .run()
  return c.json({ task }, 201)
})

const findTask = (db: D1Database, id: string) =>
  db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first<Task>()

taskRoutes.get('/:id', async (c) => {
  const task = await findTask(c.env.DB, c.req.param('id'))
  return task ? c.json({ task }) : c.json({ error: 'Task not found' }, 404)
})

taskRoutes.patch('/:id', jsonValidator(taskPatchSchema), async (c) => {
  const id = c.req.param('id')
  const existing = await findTask(c.env.DB, id)
  if (!existing) return c.json({ error: 'Task not found' }, 404)

  const body = c.req.valid('json')
  if (body.project_id && !(await projectExists(c.env.DB, body.project_id))) {
    return c.json({ error: 'Project not found' }, 400)
  }

  const task: Task = {
    ...existing,
    title: body.title ?? existing.title,
    status: (body.status as TaskStatus | undefined) ?? existing.status,
    project_id: body.project_id === undefined ? existing.project_id : body.project_id,
    updated_at: now(),
  }
  await c.env.DB.prepare(
    'UPDATE tasks SET title = ?, status = ?, project_id = ?, updated_at = ? WHERE id = ?',
  )
    .bind(task.title, task.status, task.project_id, task.updated_at, id)
    .run()
  return c.json({ task })
})

taskRoutes.delete('/:id', async (c) => {
  const result = await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(c.req.param('id')).run()
  return result.meta.changes ? c.body(null, 204) : c.json({ error: 'Task not found' }, 404)
})

const app = new Hono<{ Bindings: Env }>()
app.route('/tasks', taskRoutes)
app.route('/projects', projectRoutes)

app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((error, c) => {
  console.error(error)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app

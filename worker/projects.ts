import { Hono } from 'hono'
import type { BlockingTask, Project } from '../shared/types'
import type { Env } from './index'
import {
  jsonValidator,
  projectCreateSchema,
  projectPatchSchema,
} from './validation'

export const projectRoutes = new Hono<{ Bindings: Env }>()

const findProject = (db: D1Database, id: string) =>
  db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<Project>()

projectRoutes.get('/', async (c) => {
  c.header('Cache-Control', 'no-store')
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM projects ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'someday' THEN 1 ELSE 2 END, name COLLATE NOCASE",
  ).all<Project>()
  return c.json({ projects: results })
})

projectRoutes.post('/', jsonValidator(projectCreateSchema), async (c) => {
  const { name, status } = c.req.valid('json')
  const project: Project = { id: crypto.randomUUID(), name, status }
  await c.env.DB.prepare('INSERT INTO projects (id, name, status) VALUES (?, ?, ?)')
    .bind(project.id, project.name, project.status)
    .run()
  return c.json({ project }, 201)
})

projectRoutes.get('/:id', async (c) => {
  const project = await findProject(c.env.DB, c.req.param('id'))
  return project ? c.json({ project }) : c.json({ error: 'Project not found' }, 404)
})

projectRoutes.patch('/:id', jsonValidator(projectPatchSchema), async (c) => {
  const id = c.req.param('id')
  const existing = await findProject(c.env.DB, id)
  if (!existing) return c.json({ error: 'Project not found' }, 404)

  const body = c.req.valid('json')
  const project: Project = {
    ...existing,
    name: body.name ?? existing.name,
    status: body.status ?? existing.status,
  }
  await c.env.DB.prepare('UPDATE projects SET name = ?, status = ? WHERE id = ?')
    .bind(project.name, project.status, id)
    .run()
  return c.json({ project })
})

projectRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const project = await findProject(c.env.DB, id)
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // Tasks never cascade: the caller must move or delete them first.
  const { results: blocking } = await c.env.DB.prepare(
    'SELECT id, title, status FROM tasks WHERE project_id = ? ORDER BY created_at',
  )
    .bind(id)
    .all<BlockingTask>()
  if (blocking.length > 0) {
    return c.json(
      {
        error: 'Project has tasks',
        message: `Cannot delete "${project.name}" while ${blocking.length} task${blocking.length === 1 ? '' : 's'} still reference it. Move or delete them first.`,
        blocking_tasks: blocking,
      },
      409,
    )
  }

  await c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
  return c.body(null, 204)
})

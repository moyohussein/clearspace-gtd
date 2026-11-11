import { zValidator } from '@hono/zod-validator'
import type { Context } from 'hono'
import { z, type ZodError } from 'zod'
import { PROJECT_STATUSES, TASK_STATUSES } from '../shared/types'

export const validationError = (c: Context, error: ZodError) => {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
  return c.json(
    {
      error: 'Validation failed',
      message: issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join('; '),
      issues,
    },
    400,
  )
}

// zValidator's built-in 400 carries the raw ZodError; the hook adds the readable message.
const hook = (result: any, c: Context) =>
  result.success ? undefined : validationError(c, result.error as ZodError)

export const jsonValidator = <T extends z.ZodType>(schema: T) => zValidator('json', schema, hook)
export const queryValidator = <T extends z.ZodType>(schema: T) => zValidator('query', schema, hook)

const title = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`)

const projectId = z.string().max(64, 'Project id is too long').nullable().optional()

export const taskCreateSchema = z.object({
  title: title(1, 200, 'Title'),
  status: z.enum(TASK_STATUSES).default('inbox'),
  project_id: projectId,
})

export const taskPatchSchema = z
  .object({
    title: title(1, 200, 'Title').optional(),
    status: z
      .enum(TASK_STATUSES, { error: `Status must be one of: ${TASK_STATUSES.join(', ')}` })
      .optional(),
    project_id: projectId,
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' })

export const taskQuerySchema = z.object({
  status: z
    .enum(TASK_STATUSES, { error: `Status must be one of: ${TASK_STATUSES.join(', ')}` })
    .optional(),
})

export const projectCreateSchema = z.object({
  name: title(1, 100, 'Name'),
  status: z.enum(PROJECT_STATUSES).default('active'),
})

export const projectPatchSchema = z
  .object({
    name: title(1, 100, 'Name').optional(),
    status: z
      .enum(PROJECT_STATUSES, { error: `Status must be one of: ${PROJECT_STATUSES.join(', ')}` })
      .optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' })

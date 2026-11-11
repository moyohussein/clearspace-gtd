export const TASK_STATUSES = ['inbox', 'next', 'waiting', 'done'] as const
export const PROJECT_STATUSES = ['active', 'someday', 'archive'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export interface Task {
  id: string
  title: string
  status: TaskStatus
  project_id: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  status: ProjectStatus
}

export interface BlockingTask {
  id: string
  title: string
  status: TaskStatus
}

export interface ApiError {
  error: string
  message?: string
  issues?: Array<{ path: string; message: string }>
  blocking_tasks?: BlockingTask[]
}

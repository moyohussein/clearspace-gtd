import type { ApiError, Project, ProjectStatus, Task, TaskStatus } from '@shared/types'

// Every call is same-origin REST; Worker routes answer /tasks and /projects directly.
export class ApiRequestError extends Error {
  status: number
  blockingTasks: ApiError['blocking_tasks']

  constructor(status: number, body: Partial<ApiError>) {
    super(body.message ?? body.error ?? `Request failed (${status})`)
    this.status = status
    this.blockingTasks = body.blocking_tasks
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: init?.body ? { 'content-type': 'application/json', ...init.headers } : init?.headers,
    })
  } catch {
    throw new ApiRequestError(0, {
      error: 'Network error',
      message: 'Could not reach the server. Check your connection and try again.',
    })
  }

  if (response.status === 204) return undefined as T
  const body = (await response.json().catch(() => ({}))) as Partial<ApiError>
  if (!response.ok) throw new ApiRequestError(response.status, body)
  return body as T
}

const qs = (status?: TaskStatus) => (status ? `?status=${encodeURIComponent(status)}` : '')

export const api = {
  listTasks: (status?: TaskStatus) => request<{ tasks: Task[] }>(`/tasks${qs(status)}`).then((r) => r.tasks),
  createTask: (title: string, project_id?: string | null) =>
    request<{ task: Task }>('/tasks', { method: 'POST', body: JSON.stringify({ title, project_id }) }).then((r) => r.task),
  updateTask: (id: string, patch: Partial<Pick<Task, 'title' | 'status' | 'project_id'>>) =>
    request<{ task: Task }>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).then((r) => r.task),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),

  listProjects: () => request<{ projects: Project[] }>('/projects').then((r) => r.projects),
  createProject: (name: string, status: ProjectStatus = 'active') =>
    request<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify({ name, status }) }).then(
      (r) => r.project,
    ),
  updateProject: (id: string, patch: Partial<Pick<Project, 'name' | 'status'>>) =>
    request<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).then(
      (r) => r.project,
    ),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
}

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'someday', 'archive'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
  status TEXT NOT NULL DEFAULT 'inbox' CHECK(status IN ('inbox', 'next', 'waiting', 'done')),
  project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

INSERT OR IGNORE INTO projects (id, name, status) VALUES
  ('project-home', 'Home reset', 'active'),
  ('project-learning', 'Learn something new', 'active'),
  ('project-sabbatical', 'Sabbatical ideas', 'someday');

INSERT OR IGNORE INTO tasks (id, title, status, project_id, created_at, updated_at) VALUES
  ('task-inbox-1', 'Capture ideas for the week', 'inbox', NULL, '2026-01-01T09:00:00.000Z', '2026-01-01T09:00:00.000Z'),
  ('task-inbox-2', 'Sort through the hallway drawer', 'inbox', 'project-home', '2026-01-01T09:05:00.000Z', '2026-01-01T09:05:00.000Z'),
  ('task-next-1', 'Book a dentist appointment', 'next', 'project-home', '2026-01-01T09:10:00.000Z', '2026-01-01T09:10:00.000Z'),
  ('task-next-2', 'Read the TypeScript release notes', 'next', 'project-learning', '2026-01-01T09:15:00.000Z', '2026-01-01T09:15:00.000Z'),
  ('task-waiting-1', 'Waiting for the electrician quote', 'waiting', 'project-home', '2026-01-01T09:20:00.000Z', '2026-01-01T09:20:00.000Z'),
  ('task-waiting-2', 'Waiting for reading group feedback', 'waiting', 'project-learning', '2026-01-01T09:25:00.000Z', '2026-01-01T09:25:00.000Z'),
  ('task-done-1', 'Clear the desk', 'done', 'project-home', '2026-01-01T09:30:00.000Z', '2026-01-01T09:30:00.000Z'),
  ('task-done-2', 'Choose a programming language to explore', 'done', 'project-learning', '2026-01-01T09:35:00.000Z', '2026-01-01T09:35:00.000Z');

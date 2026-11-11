import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

// Only unapplied migrations run, so this is safe across repeated test files.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)

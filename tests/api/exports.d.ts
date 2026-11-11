// Declares the Worker's module exports so `exports.default.fetch()` is typed in
// tests, matching the module `worker/index.ts` actually exports.
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import('../../worker')
  }
}

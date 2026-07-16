import type { Request, Response, NextFunction, RequestHandler } from 'express'

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

/**
 * Wraps an async controller so any thrown error is forwarded to Express's
 * global error handler — no need for try/catch in every controller.
 *
 *   router.post('/foo', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn: AsyncFn): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

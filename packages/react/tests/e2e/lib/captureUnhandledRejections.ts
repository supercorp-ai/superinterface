// Collects the process's unhandled promise rejections instead of letting
// Vitest fail the run on them, so a test can pin an unhandled rejection.
// Returns the collected reasons and a function that restores Vitest's
// handlers.
export const captureUnhandledRejections = () => {
  const previous = process.listeners('unhandledRejection')
  const reasons: unknown[] = []
  const listener = (reason: unknown) => {
    reasons.push(reason)
  }

  process.removeAllListeners('unhandledRejection')
  process.on('unhandledRejection', listener)

  return {
    reasons,
    restore: () => {
      process.off('unhandledRejection', listener)
      previous.forEach((handler) => process.on('unhandledRejection', handler))
    },
  }
}

// Collects unhandled promise rejections instead of letting Vitest fail the
// run on them, so a test can pin a rejection the library leaves unhandled.
// Call `restore()` to give the listeners back to Vitest.
export const captureUnhandledRejections = () => {
  const errors: unknown[] = []
  const vitestListeners = process.listeners('unhandledRejection')
  const capture = (error: unknown) => {
    errors.push(error)
  }

  process.removeAllListeners('unhandledRejection')
  process.on('unhandledRejection', capture)

  return {
    errors,
    restore: () => {
      process.off('unhandledRejection', capture)
      vitestListeners.forEach((listener) =>
        process.on('unhandledRejection', listener),
      )
    },
  }
}

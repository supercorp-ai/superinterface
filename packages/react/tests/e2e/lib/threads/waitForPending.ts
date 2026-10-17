import { waitFor } from '@testing-library/react'

// Waits until the held proxy has `count` requests waiting for release.
export const waitForPending = ({
  proxy,
  count = 1,
}: {
  proxy: { pendingCount: () => number }
  count?: number
}) =>
  waitFor(
    () => {
      if (proxy.pendingCount() < count) throw new Error('Not pending yet')
    },
    { timeout: 15_000 },
  )

import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useThrottledEffect } from '@/hooks/misc/useThrottledEffect'

// Thread.Messages loads older pages through this hook; its callback reads
// whether the loader is in view, so a throttled run must use the latest one.
describe('useThrottledEffect', () => {
  it('runs the latest callback, at most once per delay, when its dependencies change', async () => {
    const calls: string[] = []
    const { rerender } = renderHook(
      ({ label, dep }: { label: string; dep: number }) =>
        useThrottledEffect(
          () => {
            calls.push(label)
          },
          500,
          [dep],
        ),
      { initialProps: { label: 'first', dep: 1 } },
    )
    expect(calls).toEqual(['first'])

    rerender({ label: 'second', dep: 2 })
    rerender({ label: 'third', dep: 3 })
    expect(calls).toEqual(['first'])

    await waitFor(() => expect(calls).toEqual(['first', 'third']), {
      timeout: 2_000,
    })
  })
})

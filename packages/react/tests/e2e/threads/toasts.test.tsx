import { useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Theme } from '@radix-ui/themes'
import { ToastsProvider } from '@/components/toasts/ToastsProvider'
import { useToasts } from '@/hooks/toasts/useToasts'
import type { Toast } from '@/types'

// No public component raises a success toast (the toasts context is not
// exported), so this renders the internal provider with a child that adds
// toasts the way the library's components do.
const AddToasts = ({ toasts }: { toasts: Toast[] }) => {
  const { addToast } = useToasts()

  useEffect(() => {
    toasts.forEach(addToast)
  }, [addToast, toasts])

  return null
}

const iconFill = ({ text }: { text: string }) =>
  screen
    .getByText(text)
    .closest('li')!
    .querySelector('svg path')!
    .getAttribute('fill')

describe('ToastsProvider', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows success and error toasts at the bottom of the viewport', () => {
    render(
      <Theme>
        <ToastsProvider>
          <AddToasts
            toasts={[
              { type: 'success', message: 'Saved.' },
              { type: 'error', message: 'Not saved.' },
            ]}
          />
        </ToastsProvider>
      </Theme>,
    )

    expect(iconFill({ text: 'Saved.' })).toBe('var(--accent-9)')
    expect(iconFill({ text: 'Not saved.' })).toBe('var(--red-9)')
    expect(screen.getByRole('region').querySelector('ol')!.style.bottom).toBe(
      '0px',
    )
  })
})

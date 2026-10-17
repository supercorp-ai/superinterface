import assert from 'node:assert'
import { describe, it } from 'node:test'
import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

describe('Next.js root page', () => {
  it('renders the running status inside the root layout', async () => {
    // Next compiles JSX with the automatic runtime; tsx uses the classic one,
    // which expects React in scope.
    Object.assign(globalThis, { React })
    const { default: RootLayout } = await import('@/app/layout')
    const { default: Page } = await import('@/app/page')

    const html = renderToStaticMarkup(
      createElement(RootLayout, null, createElement(Page)),
    )

    assert.strictEqual(
      html,
      '<html lang="en"><head></head><body><div>@superinterface/server is running.</div></body></html>',
    )
  })
})

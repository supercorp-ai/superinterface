import { test, expect } from '@playwright/test'
import { useTestAssistant } from './lib/useTestAssistant'
import { openPage } from './lib/openPage'
import { embedSrc } from './lib/embedSrc'
import { embedParams } from './lib/embedParams'
import { sendMessage } from './lib/sendMessage'
import { collectPageErrors } from './lib/collectPageErrors'

const current = useTestAssistant()

test('Thread mounts right after its script tag and streams a reply', async ({
  page,
}) => {
  const { fakeLlm, testAssistant } = current
  await openPage({
    page,
    body: `
      <p id="before">Before</p>
      <script src="${embedSrc({ bundle: 'Thread', params: embedParams({ testAssistant }) })}"></script>
      <p id="after">After</p>
    `,
  })

  const root = page.locator('.superinterface-root')
  await expect(root).toHaveCount(1)
  await expect(
    page.locator('#before + script + .superinterface-root + #after'),
  ).toHaveCount(1)
  await expect(root.locator('.radix-themes')).toHaveAttribute(
    'data-accent-color',
    'blue',
  )
  await expect(root.locator('input[type="file"]')).toHaveCount(0)

  await sendMessage({ page, text: 'Hi there' })

  await expect(root.getByText('Hi there')).toBeVisible()
  await expect(root.getByText('Hello from the fake model.')).toBeVisible()
  expect(fakeLlm.completionRequests()[0].body.messages).toEqual([
    { role: 'user', content: 'Hi there' },
  ])
})

test('BUG: a synchronous embed script in the head throws and mounts nothing', async ({
  page,
}) => {
  const { testAssistant } = current
  const pageErrors = collectPageErrors({ page })

  await openPage({
    page,
    head: `<script src="${embedSrc({ bundle: 'Thread', params: embedParams({ testAssistant }) })}"></script>`,
    body: '<p>Customer content</p>',
  })

  // BUG: rootElement reads document.body.contains() before <body> is
  // parsed. The same tag with `defer` or `async` works.
  await expect
    .poll(() => pageErrors)
    .toEqual([expect.stringContaining("reading 'contains'")])
  await expect(page.locator('.superinterface-root')).toHaveCount(0)
})

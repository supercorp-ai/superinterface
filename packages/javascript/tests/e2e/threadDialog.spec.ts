import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { useTestAssistant } from './lib/useTestAssistant'
import { openPage } from './lib/openPage'
import { embedSrc } from './lib/embedSrc'
import { embedParams } from './lib/embedParams'
import { sendMessage } from './lib/sendMessage'

const current = useTestAssistant()

test('ThreadDialog from a hosted script tag renders into its manual root element', async ({
  page,
}) => {
  const { fakeLlm, testAssistant } = current
  const scriptTagId = randomUUID()
  const src = embedSrc({
    bundle: 'ThreadDialog',
    scriptTagId,
    params: embedParams({ testAssistant }),
  })

  await openPage({
    page,
    head: `<script async defer src="${src}"></script>`,
    body: `
      <main id="content">Customer content</main>
      <section id="chat">
        <div class="superinterface-root" data-script-tag-id="ThreadDialog~${scriptTagId}"></div>
      </section>
    `,
  })

  const root = page.locator('#chat > .superinterface-root')
  await expect(page.locator('.superinterface-root')).toHaveCount(1)
  await expect(root.locator('.radix-themes')).toHaveCount(1)
  await expect(page.getByPlaceholder('Message E2E Assistant...')).toHaveCount(0)

  await root.getByRole('button').click()
  await sendMessage({ page, text: 'Hello dialog' })

  await expect(root.getByText('Hello dialog')).toBeVisible()
  await expect(root.getByText('Hello from the fake model.')).toBeVisible()
  expect(fakeLlm.completionRequests()).toHaveLength(1)
})

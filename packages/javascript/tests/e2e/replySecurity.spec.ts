import { test, expect, type Page } from '@playwright/test'
import { useTestAssistant } from './lib/useTestAssistant'
import { openPage } from './lib/openPage'
import { embedSrc } from './lib/embedSrc'
import { embedParams } from './lib/embedParams'
import { sendMessage } from './lib/sendMessage'

// Assistant replies are model output and can be steered by prompt injection,
// so nothing in a reply may run script in the customer's page.
const vectors = [
  {
    name: 'an import statement',
    reply:
      'import x from \'data:text/javascript,window.__pwned="import"\'\n\nReply done.',
  },
  {
    name: 'an inline event handler',
    reply:
      '<img src="x" onerror="window.__pwned=\'onerror\'" />\n\nReply done.',
  },
  {
    name: 'a script tag',
    reply: "<script>window.__pwned='script'</script>\n\nReply done.",
  },
  {
    name: 'a javascript: markdown link',
    reply: "[open](javascript:window.__pwned='mdlink')\n\nReply done.",
    click: 'open',
  },
  {
    name: 'a javascript: anchor',
    reply:
      '<a href="javascript:window.__pwned=\'anchor\'">go</a>\n\nReply done.',
    click: 'go',
  },
]

const showReply = async ({
  page,
  testAssistant,
}: {
  page: Page
  testAssistant: Parameters<typeof embedParams>[0]['testAssistant']
}) => {
  await openPage({
    page,
    body: `<script src="${embedSrc({ bundle: 'Thread', params: embedParams({ testAssistant }) })}"></script>`,
  })
  await sendMessage({ page, text: 'Hi' })
  await expect(page.getByText('Reply done.')).toBeVisible()
}

for (const vector of vectors) {
  test.describe(`a reply with ${vector.name}`, () => {
    const current = useTestAssistant({ replies: [{ content: vector.reply }] })

    test('does not run script in the page', async ({ page }) => {
      await showReply({ page, testAssistant: current.testAssistant })

      if (vector.click) {
        await page.getByText(vector.click, { exact: true }).click()
      }

      await page.waitForTimeout(500)
      expect(
        await page.evaluate(
          () => (window as unknown as { __pwned?: string }).__pwned ?? null,
        ),
      ).toBeNull()
    })
  })
}

test.describe('a reply with an iframe with srcdoc', () => {
  const current = useTestAssistant({
    replies: [
      {
        content:
          '<iframe srcdoc="<script>parent.__pwned=\'iframe\'</script>"></iframe>\n\nReply done.',
      },
    ],
  })

  // BUG: raw HTML in replies is rendered as is, and a srcdoc iframe shares
  // the page's origin, so its script runs with the user's session.
  test('BUG: runs script in the page', async ({ page }) => {
    await showReply({ page, testAssistant: current.testAssistant })

    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __pwned?: string }).__pwned ?? null,
        ),
      )
      .toBe('iframe')
  })
})

test.describe('a reply with an export statement', () => {
  const current = useTestAssistant({
    replies: [
      {
        content: "export const x = (window.__pwned = 'export')\n\nReply done.",
      },
    ],
  })

  // BUG: reply MDX is compiled and run, so an `export` statement in a reply
  // runs as JavaScript with the user's session.
  test('BUG: runs script in the page', async ({ page }) => {
    await showReply({ page, testAssistant: current.testAssistant })

    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __pwned?: string }).__pwned ?? null,
        ),
      )
      .toBe('export')
  })
})

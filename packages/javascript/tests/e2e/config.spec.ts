import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { useTestAssistant } from './lib/useTestAssistant'
import { openPage } from './lib/openPage'
import { embedSrc } from './lib/embedSrc'
import { embedParams } from './lib/embedParams'
import { sendMessage } from './lib/sendMessage'
import { staticBaseUrl } from './lib/staticBaseUrl'
import { testServer } from './lib/testServer'
import { routeCloudToTestServer } from './lib/routeCloudToTestServer'
import { collectPageErrors } from './lib/collectPageErrors'

const current = useTestAssistant()

const windowConfig = ({ config }: { config: Record<string, string> }) =>
  `<script>window.superinterface = ${JSON.stringify(config)}</script>`

test('a context injected by the hosted script tag wins over script params', async ({
  page,
}) => {
  const { testAssistant } = current
  const injected = {
    baseUrl: testServer().apiBaseUrl,
    variables: {
      publicApiKey: testAssistant.publicApiKey,
      assistantId: testAssistant.assistantId,
    },
  }
  const src = embedSrc({
    bundle: 'Thread',
    scriptTagId: randomUUID(),
    params: { assistantId: randomUUID() },
  })

  await openPage({
    page,
    body: `
      <script>var INJECTED_SUPERINTERFACE_CONTEXT = ${JSON.stringify(injected)}</script>
      <script src="${src}"></script>
    `,
  })

  await sendMessage({ page, text: 'Injected hello' })
  await expect(page.getByText('Hello from the fake model.')).toBeVisible()
})

test('an ES module build reads window.superinterface and mounts at the end of the body', async ({
  page,
}) => {
  const { testAssistant } = current
  await openPage({
    page,
    body: `
      ${windowConfig({ config: embedParams({ testAssistant }) })}
      <script type="module" src="${staticBaseUrl()}/dist/Thread.mjs"></script>
      <p id="content">Customer content</p>
    `,
  })

  await expect(
    page.locator('#content + .superinterface-root .radix-themes'),
  ).toHaveCount(1)
  await sendMessage({ page, text: 'Module hello' })
  await expect(page.getByText('Hello from the fake model.')).toBeVisible()
})

test('a script tag without params falls back to window.superinterface, which defaults to Superinterface Cloud', async ({
  page,
}) => {
  const { testAssistant } = current
  const { cloudUrls } = await routeCloudToTestServer({ page })
  const { baseUrl: _baseUrl, ...config } = embedParams({ testAssistant })

  await openPage({
    page,
    body: `
      ${windowConfig({ config })}
      <script src="${embedSrc({ bundle: 'Thread' })}"></script>
    `,
  })

  await expect(page.locator('.superinterface-root .radix-themes')).toHaveCount(
    1,
  )
  await expect
    .poll(() => cloudUrls)
    .toEqual([
      `https://superinterface.ai/api/cloud/assistants/${testAssistant.assistantId}?publicApiKey=${testAssistant.publicApiKey}`,
      `https://superinterface.ai/api/cloud/messages?publicApiKey=${testAssistant.publicApiKey}&assistantId=${testAssistant.assistantId}`,
    ])
  await page.unrouteAll({ behavior: 'wait' })
})

test('script params without a baseUrl default to Superinterface Cloud', async ({
  page,
}) => {
  const { testAssistant } = current
  const { cloudUrls } = await routeCloudToTestServer({ page })
  const { baseUrl: _baseUrl, ...params } = embedParams({ testAssistant })

  await openPage({
    page,
    body: `
      ${windowConfig({ config: { baseUrl: `${staticBaseUrl()}/unused` } })}
      <script src="${embedSrc({ bundle: 'Thread', params })}"></script>
    `,
  })

  await expect(page.locator('.superinterface-root .radix-themes')).toHaveCount(
    1,
  )
  await expect
    .poll(() => cloudUrls)
    .toEqual([
      `https://superinterface.ai/api/cloud/assistants/${testAssistant.assistantId}?publicApiKey=${testAssistant.publicApiKey}`,
      `https://superinterface.ai/api/cloud/messages?publicApiKey=${testAssistant.publicApiKey}&assistantId=${testAssistant.assistantId}`,
    ])
  await page.unrouteAll({ behavior: 'wait' })
})

test('a baseUrl alone is a valid script tag config, so window.superinterface is ignored', async ({
  page,
}) => {
  const { testAssistant } = current
  const assistantRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/assistants/')) {
      assistantRequests.push(request.url())
    }
  })

  await openPage({
    page,
    body: `
      ${windowConfig({ config: embedParams({ testAssistant }) })}
      <script src="${embedSrc({ bundle: 'Thread', params: { baseUrl: testServer().apiBaseUrl } })}"></script>
    `,
  })

  // The script tag has no assistantId, so the assistant never loads and
  // nothing renders.
  await expect
    .poll(() => assistantRequests)
    .toEqual([`${testServer().apiBaseUrl}/assistants/undefined`])
  await expect(page.locator('.superinterface-root')).toHaveCount(1)
  await expect(page.locator('.superinterface-root')).toBeEmpty()
})

test('without any config the embed throws and mounts nothing', async ({
  page,
}) => {
  const pageErrors = collectPageErrors({ page })

  await openPage({
    page,
    body: `<script src="${embedSrc({ bundle: 'Thread' })}"></script>`,
  })

  await expect
    .poll(() => pageErrors)
    .toEqual([
      'Superinterface context is not set up. Please read Superinterface integration docs.',
    ])
  await expect(page.locator('.superinterface-root')).toHaveCount(0)
})

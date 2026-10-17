import { test, expect, type Page } from '@playwright/test'
import { openPage } from './lib/openPage'
import { staticBaseUrl } from './lib/staticBaseUrl'
import { collectPageErrors } from './lib/collectPageErrors'

const roots = ({ page }: { page: Page }) => page.locator('.superinterface-root')

// The number of <style> tags rootElement added to the head.
const rootStyleCount = ({ page }: { page: Page }) =>
  page
    .locator('head > style')
    .evaluateAll(
      (styles) =>
        styles.filter((style) =>
          style.textContent?.includes('.superinterface-root {'),
        ).length,
    )

test('mounts right after a script tag in the body', async ({ page }) => {
  await openPage({
    page,
    body: `
      <p id="before">Before</p>
      <script src="${staticBaseUrl()}/embed.js"></script>
      <p id="after">After</p>
    `,
  })

  await expect(
    page.locator(
      '#before + script + .superinterface-root[data-mounted] + #after',
    ),
  ).toHaveCount(1)
  await expect(roots({ page })).not.toHaveAttribute('data-script-tag-id')
  expect(await rootStyleCount({ page })).toBe(1)
  // The <style> rootElement appends to the head lays the root out as a
  // growing flex container capped at the viewport height.
  await expect(roots({ page })).toHaveCSS('display', 'flex')
  await expect(roots({ page })).toHaveCSS('flex-grow', '1')
  await expect(roots({ page })).toHaveCSS(
    'max-height',
    `${page.viewportSize()!.height}px`,
  )
})

test('mounts a root per script tag', async ({ page }) => {
  await openPage({
    page,
    body: `
      <div id="first"><script src="${staticBaseUrl()}/embed.js"></script></div>
      <div id="second"><script src="${staticBaseUrl()}/embed.js"></script></div>
    `,
  })

  await expect(
    page.locator('#first > script + .superinterface-root'),
  ).toHaveCount(1)
  await expect(
    page.locator('#second > script + .superinterface-root'),
  ).toHaveCount(1)
  // Each root appends its own <style> to the head.
  expect(await rootStyleCount({ page })).toBe(2)
})

test('tags the root with the id of a hosted script tag', async ({ page }) => {
  await openPage({
    page,
    body: `
      <script src="${staticBaseUrl()}/script-tags/tag-1?publicApiKey=key"></script>
      <p id="after">After</p>
    `,
  })

  await expect(
    page.locator('script + .superinterface-root + #after'),
  ).toHaveCount(1)
  await expect(roots({ page })).toHaveAttribute('data-script-tag-id', 'tag-1')
})

test('uses the manual root element placed for a hosted script tag', async ({
  page,
}) => {
  await openPage({
    page,
    body: `
      <section id="chat">
        <div class="superinterface-root" data-script-tag-id="tag-1"></div>
      </section>
      <script src="${staticBaseUrl()}/script-tags/tag-1"></script>
    `,
  })

  await expect(roots({ page })).toHaveCount(1)
  await expect(page.locator('#chat > .superinterface-root')).toHaveAttribute(
    'data-mounted',
  )
  expect(await rootStyleCount({ page })).toBe(0)
})

test('ignores manual root elements placed for other script tags', async ({
  page,
}) => {
  await openPage({
    page,
    body: `
      <section id="chat">
        <div class="superinterface-root" data-script-tag-id="tag-2"></div>
      </section>
      <script src="${staticBaseUrl()}/script-tags/tag-1"></script>
      <p id="after">After</p>
    `,
  })

  await expect(
    page.locator('#chat > .superinterface-root'),
  ).not.toHaveAttribute('data-mounted')
  // It mounts a new root right after its script tag in the body instead.
  await expect(
    page.locator('script + .superinterface-root[data-mounted]'),
  ).toHaveAttribute('data-script-tag-id', 'tag-1')
  await expect(
    page.locator('script + .superinterface-root[data-mounted] + #after'),
  ).toHaveCount(1)
})

test('appends to the end of the body for a deferred script in the head', async ({
  page,
}) => {
  await openPage({
    page,
    head: `<script defer src="${staticBaseUrl()}/script-tags/tag-1"></script>`,
    body: `<p id="content">Content</p>`,
  })

  await expect(
    page.locator(
      'body > #content + .superinterface-root[data-mounted]:last-child',
    ),
  ).toHaveAttribute('data-script-tag-id', 'tag-1')
  expect(await rootStyleCount({ page })).toBe(1)
})

test('appends to the end of the body without a current script', async ({
  page,
}) => {
  await openPage({
    page,
    body: `
      <script type="module">
        import { rootElement } from '${staticBaseUrl()}/dist/index.mjs'
        rootElement({ currentScript: document.currentScript }).setAttribute('data-mounted', '')
      </script>
      <p id="content">Content</p>
    `,
  })

  const root = page.locator(
    'body > #content + .superinterface-root[data-mounted]:last-child',
  )
  await expect(root).toHaveCount(1)
  await expect(root).not.toHaveAttribute('data-script-tag-id')
  expect(await rootStyleCount({ page })).toBe(1)
})

test('BUG: a synchronous script in the head throws because the body does not exist yet', async ({
  page,
}) => {
  const pageErrors = collectPageErrors({ page })

  await openPage({
    page,
    head: `<script src="${staticBaseUrl()}/embed.js"></script>`,
    body: `<p id="content">Content</p>`,
  })

  // BUG: rootElement reads document.body.contains() before <body> is parsed,
  // so the "not in body" fallback never gets to append to the body.
  await expect
    .poll(() => pageErrors)
    .toEqual([expect.stringContaining("reading 'contains'")])
  await expect(roots({ page })).toHaveCount(0)
})

test('BUG: an inline script throws because it has no src to read a script tag id from', async ({
  page,
}) => {
  const pageErrors = collectPageErrors({ page })
  const response = await fetch(`${staticBaseUrl()}/embed.js`)

  await openPage({
    page,
    body: `<script>${await response.text()}</script>`,
  })

  // BUG: scriptTagId parses `new URL(currentScript.src)`, and an inline
  // script's src is ''.
  await expect
    .poll(() => pageErrors)
    .toEqual([expect.stringContaining('Invalid URL')])
  await expect(roots({ page })).toHaveCount(0)
})

import type { Page } from '@playwright/test'
import { staticBaseUrl } from './staticBaseUrl'

// Opens a customer page with the given markup, served by the static server
// that also serves the built embeds.
export const openPage = async ({
  page,
  head = '',
  body,
}: {
  page: Page
  head?: string
  body: string
}) => {
  const response = await fetch(`${staticBaseUrl()}/pages`, {
    method: 'POST',
    body: `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`,
  })

  await page.goto(`${staticBaseUrl()}${await response.text()}`)
}

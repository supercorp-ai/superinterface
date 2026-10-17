import type { Page } from '@playwright/test'

// Types a message into the embed's message form and submits it.
export const sendMessage = async ({
  page,
  text,
}: {
  page: Page
  text: string
}) => {
  const field = page.getByPlaceholder('Message E2E Assistant...')
  await field.fill(text)
  await field.press('Enter')
}

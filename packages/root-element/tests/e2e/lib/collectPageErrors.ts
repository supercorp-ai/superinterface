import type { Page } from '@playwright/test'

// Uncaught errors thrown by scripts on the page.
export const collectPageErrors = ({ page }: { page: Page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  return pageErrors
}

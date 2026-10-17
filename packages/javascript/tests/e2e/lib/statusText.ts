import type { Locator } from '@playwright/test'

// The audio thread status shown through a CSS `content` rule, e.g.
// 'Click the button below to activate'.
export const statusText = async ({ root }: { root: Locator }) => {
  const styles = await root.locator('style').allTextContents()

  return styles.join('\n').match(/content: '([^']*)'/)?.[1] ?? null
}

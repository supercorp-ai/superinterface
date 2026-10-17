import { test, expect } from '@playwright/test'
import { useTestAssistant } from './lib/useTestAssistant'
import { openPage } from './lib/openPage'
import { embedSrc } from './lib/embedSrc'
import { embedParams } from './lib/embedParams'
import { collectPageErrors } from './lib/collectPageErrors'
import { sendMessage } from './lib/sendMessage'

const current = useTestAssistant()

for (const { bundle, isDialog } of [
  { bundle: 'ThreadFilesEnabled', isDialog: false },
  { bundle: 'ThreadDialogFilesEnabled', isDialog: true },
]) {
  test(`${bundle} adds a file control to the message form`, async ({
    page,
  }) => {
    const { testAssistant } = current
    const pageErrors = collectPageErrors({ page })
    await openPage({
      page,
      body: `<script src="${embedSrc({ bundle, params: embedParams({ testAssistant }) })}"></script><p id="after">After</p>`,
    })

    // The page sets no window.superinterface: the bundle finds its config in
    // its own script tag (document.currentScript) and mounts right after that
    // tag. Without the tag it would throw instead of mounting, or mount at
    // the end of the body.
    const root = page.locator('.superinterface-root')
    await expect(
      page.locator('body > script + .superinterface-root + #after'),
    ).toHaveCount(1)
    await expect(root.locator('.radix-themes')).toHaveCount(1)
    expect(pageErrors).toEqual([])
    if (isDialog) await root.getByRole('button').click()

    const fileInput = root.locator('input[type="file"]')
    await expect(fileInput).toHaveCount(1)
    await expect(fileInput).toHaveAttribute('multiple', '')

    await sendMessage({ page, text: 'Files are on' })
    await expect(root.getByText('Hello from the fake model.')).toBeVisible()
  })
}

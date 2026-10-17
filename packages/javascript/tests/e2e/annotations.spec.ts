import type { Locator } from '@playwright/test'
import { test, expect } from '@playwright/test'
import { useTestAssistant } from './lib/useTestAssistant'
import { openPage } from './lib/openPage'
import { embedSrc } from './lib/embedSrc'
import { embedParams } from './lib/embedParams'
import { sendMessage } from './lib/sendMessage'
import { annotateMessage } from './lib/annotateMessage'

const marker = '【4:0†source】'

type Expectation = (args: { message: Locator }) => Promise<void>

// The built-in annotation component: a popover saying the file was cited.
const expectDefaultCitation: Expectation = async ({ message }) => {
  await message.getByRole('button').click()
  await expect(message.page().getByText('File cited.')).toBeVisible()
}

// SourceAnnotation: a button that opens the cited source in a dialog. The
// file's contents are answered in the browser: for an Ollama-provider
// assistant the server would look the file up on api.openai.com.
const expectSourceCitation: Expectation = async ({ message }) => {
  await message
    .page()
    .route('**/files/file-e2e-citation/contents**', (route) =>
      route.fulfill({ status: 404, json: { error: 'No file found' } }),
    )
  await message.getByRole('button').click()
  await expect(
    message.page().getByRole('dialog', { name: 'Source' }),
  ).toBeVisible()
}

// `annotation: () => null`: the citation renders nothing.
const expectNoCitation: Expectation = async ({ message }) => {
  await expect(message.getByRole('button')).toHaveCount(0)
}

const cases: {
  bundle: string
  isDialog: boolean
  expectCitation: Expectation
}[] = [
  { bundle: 'Thread', isDialog: false, expectCitation: expectDefaultCitation },
  ...[
    'Thread',
    'ThreadFilesEnabled',
    'ThreadDialog',
    'ThreadDialogFilesEnabled',
  ].flatMap((base) => [
    {
      bundle: `${base}AnnotationsComponentSource`,
      isDialog: base.startsWith('ThreadDialog'),
      expectCitation: expectSourceCitation,
    },
    {
      bundle: `${base}AnnotationsComponentDisabled`,
      isDialog: base.startsWith('ThreadDialog'),
      expectCitation: expectNoCitation,
    },
  ]),
]

for (const { bundle, isDialog, expectCitation } of cases) {
  const reply = `See the cited source${marker} for ${bundle}.`

  test.describe(() => {
    const current = useTestAssistant({ replies: [{ content: reply }] })

    test(`${bundle} renders file citations`, async ({ page }) => {
      const { testAssistant } = current
      await openPage({
        page,
        body: `<script src="${embedSrc({ bundle, params: embedParams({ testAssistant }) })}"></script><p id="after">After</p>`,
      })

      // The bundle finds its config in its own script tag and mounts right
      // after it.
      const root = page.locator('.superinterface-root')
      await expect(
        page.locator('body > script + .superinterface-root + #after'),
      ).toHaveCount(1)
      const openDialog = async () => {
        if (!isDialog) return
        await expect(root.locator('.radix-themes')).toHaveCount(1)
        await root.getByRole('button').click()
      }

      await openDialog()
      await sendMessage({ page, text: 'Cite a source' })
      await expect(root.getByText(reply)).toBeVisible()

      await annotateMessage({ text: reply, marker })
      await page.reload()
      await openDialog()

      const message = root.getByText(`See the cited source for ${bundle}.`)
      await expect(message).toBeVisible()
      await expect(root.getByText(marker)).toHaveCount(0)
      await expectCitation({ message })
    })
  })
}

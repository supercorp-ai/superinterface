import { test, expect } from '@playwright/test'
import { useTestAssistant } from './lib/useTestAssistant'
import { openPage } from './lib/openPage'
import { embedSrc } from './lib/embedSrc'
import { embedParams } from './lib/embedParams'
import { collectPageErrors } from './lib/collectPageErrors'
import { statusText } from './lib/statusText'
import { testServer } from './lib/testServer'

const current = useTestAssistant()

// Chromium runs with a fake microphone (see playwright.config.ts).
for (const { bundle, isDialog, isWebrtc } of [
  { bundle: 'AudioThread', isDialog: false, isWebrtc: false },
  { bundle: 'AudioThreadDialog', isDialog: true, isWebrtc: false },
  { bundle: 'AudioThreadWebrtcAudioRuntime', isDialog: false, isWebrtc: true },
  {
    bundle: 'AudioThreadDialogWebrtcAudioRuntime',
    isDialog: true,
    isWebrtc: true,
  },
]) {
  test(`${bundle} mounts an idle audio thread`, async ({ page }) => {
    const { testAssistant } = current
    const webrtcOffers: string[] = []
    page.on('request', (request) => {
      if (
        request
          .url()
          .startsWith(`${testServer().apiBaseUrl}/audio-runtimes/webrtc?`)
      ) {
        webrtcOffers.push(request.postData() ?? '')
      }
    })

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

    if (isDialog) {
      await expect(root.getByRole('button')).toHaveCount(1)
      expect(await statusText({ root })).toBeNull()
      await root.getByRole('button').click()
    }

    await expect
      .poll(() => statusText({ root }))
      .toBe('Click the button below to activate')

    const actionButton = isDialog
      ? root.getByRole('button').first()
      : root.getByRole('button')
    await actionButton.click()

    if (!isWebrtc) {
      // The TTS runtime only records locally until the user speaks.
      await page.waitForTimeout(1_000)
      expect(webrtcOffers).toEqual([])
      return
    }

    // The WebRTC runtime sends an SDP offer for the assistant to the server.
    // The open-source server has no /audio-runtimes/webrtc route, so the
    // realtime session itself can't be reached here.
    await expect.poll(() => webrtcOffers.length).toBe(1)
    expect(webrtcOffers[0]).toMatch(/^v=0/)
  })
}

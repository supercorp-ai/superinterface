import type { Page } from '@playwright/test'
import { testServer } from './testServer'

const cloudBaseUrl = 'https://superinterface.ai/api/cloud'

// Embeds without a `baseUrl` talk to Superinterface Cloud. Answers those
// requests from the test server instead and returns the URLs they went to.
export const routeCloudToTestServer = async ({ page }: { page: Page }) => {
  const cloudUrls: string[] = []

  await page.route(`${cloudBaseUrl}/**`, async (route) => {
    const url = route.request().url()
    cloudUrls.push(url)
    const response = await route.fetch({
      url: url.replace(cloudBaseUrl, testServer().apiBaseUrl),
    })
    await route.fulfill({ response })
  })

  return { cloudUrls }
}

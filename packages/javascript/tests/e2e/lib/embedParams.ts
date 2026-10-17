import type { TestAssistant } from './createTestAssistant'
import { testServer } from './testServer'

// Script tag query params that point an embed at the test assistant.
export const embedParams = ({
  testAssistant,
}: {
  testAssistant: TestAssistant
}) => ({
  publicApiKey: testAssistant.publicApiKey,
  assistantId: testAssistant.assistantId,
  baseUrl: testServer().apiBaseUrl,
})

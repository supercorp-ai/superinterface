import { test } from '@playwright/test'
import {
  startFakeLlm,
  type FakeLlmReply,
} from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant, type TestAssistant } from './createTestAssistant'

type FakeLlm = Awaited<ReturnType<typeof startFakeLlm>>

// Gives every test in the enclosing scope its own fake LLM answering with
// `replies`, and an assistant on the real server that talks to it.
export const useTestAssistant = ({
  replies = [{ content: 'Hello from the fake model.' }],
}: {
  replies?: FakeLlmReply[]
} = {}) => {
  const current = {} as { fakeLlm: FakeLlm; testAssistant: TestAssistant }

  test.beforeEach(async () => {
    current.fakeLlm = await startFakeLlm({ replies })
    current.testAssistant = await createTestAssistant({
      llmBaseUrl: current.fakeLlm.baseURL,
    })
  })

  test.afterEach(async () => {
    await current.fakeLlm.close()
  })

  return current
}

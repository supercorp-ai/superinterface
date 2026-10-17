import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import { ToolType } from '@prisma/client'
import { startFakeLlm } from '../../lib/llm/startFakeLlm'
import { createFakeLlmAssistant } from '../../lib/assistants/createFakeLlmAssistant'
import { createTestNativeTool } from '../../lib/tools/createTestNativeTool'
import { postMessage } from '../../lib/messages/postMessage'

describe('code interpreter on a provider without one', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>

  before(async () => {
    fakeLlm = await startFakeLlm({ replies: [{ content: 'No tools here.' }] })
  })

  after(async () => {
    await fakeLlm.close()
  })

  it('leaves the code interpreter out of the tools sent to Ollama', async () => {
    const { assistant, publicKey } = await createFakeLlmAssistant({
      baseURL: fakeLlm.baseURL,
    })
    await createTestNativeTool({
      assistantId: assistant.id,
      type: ToolType.CODE_INTERPRETER,
    })

    const { status, events } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey: publicKey.value,
        content: 'Run some code.',
      },
    })

    assert.strictEqual(status, 200)
    const [completionRequest] = fakeLlm.completionRequests()
    // The only configured tool has no Ollama equivalent, so the request
    // carries no tools at all: not an empty list and not a null entry.
    assert.strictEqual('tools' in completionRequest.body, false)
    const completed = events.find(
      ({ event }) => event === 'thread.message.completed',
    )
    assert.strictEqual(completed?.data.content[0].text.value, 'No tools here.')
  })
})

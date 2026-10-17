import type { Prisma } from '@prisma/client'
import { startFakeLlm, type FakeLlmToolCall } from '../llm/startFakeLlm'
import { createFakeLlmAssistant } from '../assistants/createFakeLlmAssistant'
import { postMessage } from '../messages/postMessage'

type Assistant = Awaited<ReturnType<typeof createFakeLlmAssistant>>['assistant']

type ToolMessage = { role: 'tool'; tool_call_id: string; content: string }

// Runs a full /api/messages round trip where the fake model first requests
// `toolCalls` and then answers `finalContent`. Returns what the server sent
// back to the model as tool outputs, plus the stream events.
export const runFakeToolCalls = async ({
  toolCalls,
  finalContent = 'done',
  assistantData,
  setup = async () => {},
  beforeToolCalls = () => {},
  body = {},
}: {
  toolCalls: FakeLlmToolCall[]
  finalContent?: string
  assistantData?: Partial<Prisma.AssistantUncheckedCreateInput>
  // May return extra fields for the POST body, e.g. an existing `threadId`.
  setup?: (args: {
    assistant: Assistant
  }) => Promise<Record<string, unknown> | void>
  // Runs right before the fake model answers with the tool calls, i.e. after
  // the run (and its tools list) has been created.
  beforeToolCalls?: () => void
  body?: Record<string, unknown>
}) => {
  const fakeLlm = await startFakeLlm({
    respond: ({ index }) => {
      if (index > 0) return { content: finalContent }
      beforeToolCalls()
      return { toolCalls }
    },
  })

  try {
    const { assistant, publicKey, workspace } = await createFakeLlmAssistant({
      baseURL: fakeLlm.baseURL,
      data: assistantData,
    })
    const setupBody = await setup({ assistant })

    const { status, events, json } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey: publicKey.value,
        content: 'Please use the tool.',
        ...body,
        ...(setupBody ?? {}),
      },
    })

    const completionRequests = fakeLlm.completionRequests()
    const followUp = completionRequests[1]
    const toolMessages: ToolMessage[] = (followUp?.body.messages ?? []).filter(
      ({ role }: { role: string }) => role === 'tool',
    )

    return {
      status,
      events,
      json,
      assistant,
      workspace,
      completionRequests,
      toolMessages,
      toolOutputs: toolMessages.map(({ content }) => content),
    }
  } finally {
    await fakeLlm.close()
  }
}

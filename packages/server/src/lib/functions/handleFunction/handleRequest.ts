import OpenAI from 'openai'
import {
  RequestHandler,
  Assistant,
  Thread,
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  type PrismaClient,
} from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'
import { interpolateFunctionValue } from '../interpolateFunctionValue'

const url = ({
  requestHandler,
  args,
  thread,
  assistant,
}: {
  requestHandler: RequestHandler
  args: Record<string, unknown>
  thread: Thread
  assistant: Assistant
}) => {
  const { value, missing } = interpolateFunctionValue({
    value: requestHandler.url,
    args,
    thread,
    assistant,
  })

  if (requestHandler.method === 'GET') {
    if (!Object.keys(args).length) return { url: value, missing }
    const params = new URLSearchParams(
      Object.entries(args).reduce<Record<string, string>>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc, [k, v]) => ({ ...acc, [k]: String(v as any) }),
        {},
      ),
    )
    return { url: `${value}?${params.toString()}`, missing }
  }

  return { url: value, missing }
}

const body = ({
  requestHandler,
  args,
  thread,
  assistant,
}: {
  requestHandler: RequestHandler
  args: Record<string, unknown>
  thread: Thread
  assistant: Assistant
}) => {
  if (requestHandler.method === 'GET') {
    return { body: undefined, missing: [] as string[] }
  }

  const merged = { ...requestHandler.body, ...args }

  const missing: string[] = []

  for (const [k, v] of Object.entries(requestHandler.body)) {
    if (k in (args || {})) continue
    if (typeof v === 'string') {
      const res = interpolateFunctionValue({
        value: v,
        args,
        thread,
        assistant,
      })
      merged[k] = res.value
      missing.push(...res.missing)
    }
  }

  return { body: merged, missing }
}

const headers = ({
  requestHandler,
  args,
  thread,
  assistant,
}: {
  requestHandler: RequestHandler
  args: Record<string, unknown>
  thread: Thread
  assistant: Assistant
}) => {
  const result: Record<string, string> = {}
  const missing: string[] = []

  for (const [k, v] of Object.entries(requestHandler.headers)) {
    const res = interpolateFunctionValue({ value: v, args, thread, assistant })
    result[k] = res.value
    missing.push(...res.missing)
  }

  return { headers: result, missing }
}

export const handleRequest = async ({
  requestHandler,
  toolCall,
  assistant,
  thread,
  prisma,
}: {
  requestHandler: RequestHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}) => {
  let args: Record<string, unknown> = {}

  try {
    args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        message: `Failed parsing request function arguments: ${e.message}`,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({
        error: e.message,
      }),
    }
  }

  const urlRes = url({ requestHandler, args, thread, assistant })
  const bodyRes = body({ requestHandler, args, thread, assistant })
  const headersRes = headers({ requestHandler, args, thread, assistant })

  const missing = [...urlRes.missing, ...bodyRes.missing, ...headersRes.missing]

  if (missing.length) {
    const message = `Missing variables in request handler: ${missing.join(', ')}`

    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 400,
        message,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return { tool_call_id: toolCall.id, output: message }
  }

  const opts = {
    method: requestHandler.method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headersRes.headers,
    },
    body: bodyRes.body ? JSON.stringify(bodyRes.body) : undefined,
  }

  let response

  try {
    response = await fetch(urlRes.url, opts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        message: `Request failed: ${e.message}`,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({
        error: e.message,
      }),
    }
  }

  const contentType = response.headers.get('content-type')

  if (contentType && contentType.includes('application/json')) {
    let jsonResult

    try {
      jsonResult = await response.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Failed parsing request response: ${e.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify({
          error: e.message,
        }),
      }
    }

    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify(jsonResult),
    }
  } else {
    let textResult

    try {
      textResult = await response.text()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Failed parsing request response: ${e.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify({
          error: e.message,
        }),
      }
    }

    return {
      tool_call_id: toolCall.id,
      output: textResult,
    }
  }
}

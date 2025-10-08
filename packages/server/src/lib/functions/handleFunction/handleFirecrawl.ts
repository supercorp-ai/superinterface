import OpenAI from 'openai'
import {
  FirecrawlHandler,
  FirecrawlHandlerType,
  Assistant,
  Thread,
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  type PrismaClient,
} from '@prisma/client'
import FirecrawlApp from '@mendable/firecrawl-js'
import { omit } from 'radash'
import { createLog } from '@/lib/logs/createLog'

export const handleFirecrawl = async ({
  firecrawlHandler,
  toolCall,
  assistant,
  thread,
  prisma,
}: {
  firecrawlHandler: FirecrawlHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}) => {
  let args

  try {
    args = JSON.parse(toolCall.function.arguments)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 400,
        message: `Failed parsing Firecrawl function arguments: ${e.message}`,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: 'Invalid arguments.',
    }
  }

  const firecrawl = new FirecrawlApp({ apiKey: firecrawlHandler.apiKey })

  if (firecrawlHandler.type === FirecrawlHandlerType.SCRAPE) {
    try {
      const result = await firecrawl.scrapeUrl(args.url, {
        ...firecrawlHandler.body,
        ...omit(args, ['url']),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formats: (firecrawlHandler.body.formats as any) ?? [
          'markdown' as const,
        ],
      })

      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify(result),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: `Failed calling Firecrawl function: ${e.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: 'Function call failed.',
      }
    }
  } else if (firecrawlHandler.type === FirecrawlHandlerType.CRAWL) {
    try {
      const result = await firecrawl.crawlUrl(args.url, {
        ...firecrawlHandler.body,
        ...omit(args, ['url']),
      })

      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify(result),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: `Failed calling Firecrawl function: ${e.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: 'Function call failed.',
      }
    }
  } else if (firecrawlHandler.type === FirecrawlHandlerType.EXTRACT) {
    try {
      const result = await firecrawl.scrapeUrl(args.url, {
        formats: ['extract'],
        ...omit(args, ['url']),
      })

      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify(result),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: `Failed calling Firecrawl function: ${e.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: 'Function call failed.',
      }
    }
  } else if (firecrawlHandler.type === FirecrawlHandlerType.SEARCH) {
    try {
      const response = await fetch('https://api.firecrawl.dev/v0/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${firecrawlHandler.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...firecrawlHandler.body,
          ...args,
        }),
      })

      const result = await response.json()

      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify(result),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: `Failed calling Firecrawl function: ${e.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: 'Function call failed.',
      }
    }
  } else {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 400,
        message: `Invalid Firecrawl handler type: ${firecrawlHandler.type}`,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({
        success: false,
        message: 'Invalid Firecrawl handler type',
      }),
    }
  }
}

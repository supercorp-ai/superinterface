import { type NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  type PrismaClient,
} from '@prisma/client'
import type { Thread } from '@prisma/client'
import {
  messagesResponse,
  createMessageResponse,
} from '@superinterface/react/server'
import { enqueueJson } from '@superinterface/react/utils'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { z } from 'zod'
import { storageThreadId as getStorageThreadId } from '@/lib/threads/storageThreadId'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { content as getContent } from '@/lib/messages/content'
import { workspaceAccessWhere as getWorkspaceAccessWhere } from '@/lib/apiKeys/workspaceAccessWhere'
import { initialMessagesResponse } from './lib/initialMessagesResponse'
import { createRunOpts } from '@/lib/runs/createRunOpts'
import { handleToolCall } from '@/lib/toolCalls/handleToolCall'
import { createThread } from '@/lib/threads/createThread'
import { managedOpenaiThreadId } from '@/lib/threads/managedOpenaiThreadId'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { createLog } from '@/lib/logs/createLog'
import { serializeThread } from './lib/serializeThread'
import { getWorkspaceId } from './lib/getWorkspaceId'
import { validThreadId } from '@/lib/threads/validThreadId'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { serializeMetadata } from '@/lib/metadata/serializeMetadata'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { serializeError } from '@/lib/errors/serializeError'

export const maxDuration = 800

export const buildGET =
  ({ prisma = defaultPrisma }: { prisma?: PrismaClient } = {}) =>
  async (request: NextRequest) => {
    const paramsResult = z
      .object({
        publicApiKey: z.string().optional(),
        assistantId: z.string().optional(),
        threadId: z.string().optional(),
        pageParam: z.string().optional(),
      })
      .parse(Object.fromEntries(request.nextUrl.searchParams.entries()))

    const workspaceAccessWhere = await getWorkspaceAccessWhere({
      publicApiKey: paramsResult.publicApiKey ?? null,
      prisma,
    })

    if (!workspaceAccessWhere) {
      return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
    }

    const assistantId = paramsResult.assistantId

    if (!assistantId) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: 'No assistantId found.',
          workspaceId: await getWorkspaceId({ workspaceAccessWhere, prisma }),
        },
        prisma,
      })

      return NextResponse.json(
        { error: 'No assistant id found' },
        { status: 400 },
      )
    }

    const { threadId, pageParam } = paramsResult

    const assistant = await prisma.assistant.findFirst({
      where: {
        id: assistantId,
        workspace: workspaceAccessWhere,
      },
      include: {
        threads: {
          where: {
            id: validThreadId({ threadId: threadId ?? null }),
          },
          take: 1,
          include: {
            assistant: {
              select: {
                storageProviderType: true,
              },
            },
          },
        },
        workspace: {
          include: {
            modelProviders: true,
          },
        },
        modelProvider: true,
        initialMessages: {
          orderBy: {
            orderNumber: 'desc',
          },
        },
        mcpServers: {
          include: {
            computerUseTool: true,
            stdioTransport: true,
            sseTransport: true,
            httpTransport: true,
          },
        },
        tools: {
          include: {
            fileSearchTool: true,
            webSearchTool: true,
            imageGenerationTool: true,
            codeInterpreterTool: true,
            computerUseTool: true,
          },
        },
        functions: true,
      },
    })

    if (!assistant) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: 'No assistant found.',
          workspaceId: await getWorkspaceId({ workspaceAccessWhere, prisma }),
        },
        prisma,
      })

      return NextResponse.json({ error: 'No assistant found' }, { status: 400 })
    }

    if (!threadId) {
      return NextResponse.json(await initialMessagesResponse({ assistant }), {
        headers: cacheHeaders,
      })
    }

    const thread = assistant.threads[0]

    if (!thread) {
      return NextResponse.json(await initialMessagesResponse({ assistant }), {
        headers: cacheHeaders,
      })
    }

    const client = assistantClientAdapter({ assistant, prisma, thread })

    const storageThreadId = getStorageThreadId({
      thread,
    })

    if (!storageThreadId) {
      return NextResponse.json(await initialMessagesResponse({ assistant }), {
        headers: cacheHeaders,
      })
    }

    try {
      return NextResponse.json(
        await messagesResponse({
          threadId: storageThreadId,
          client,
          ...(pageParam ? { pageParam } : {}),
        }),
        {
          headers: cacheHeaders,
        },
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.dir({ error }, { depth: null })
      createLog({
        log: {
          requestMethod: LogRequestMethod.GET,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Failed to load messages: ${error.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })
      return NextResponse.json(
        { error: 'Failed to load messages.' },
        { status: 500 },
      )
    }
  }

export const GET = buildGET()

export const buildPOST =
  ({
    prisma = defaultPrisma,
    onSuccessCreateThread = () => void 0,
  }: {
    prisma?: PrismaClient
    onSuccessCreateThread?: ({
      thread,
    }: {
      thread: Thread
    }) => void | Promise<void>
  } = {}) =>
  async (request: NextRequest) => {
    const bodyResult = z
      .object({
        audioContent: z.any().optional(),
        content: z.any().optional(),
        attachments: z.array(z.any()).optional(),
        assistantId: z.string().optional(),
        publicApiKey: z.string().optional(),
        threadId: z.string().optional(),
      })
      .passthrough()
      .parse(await request.json())

    const {
      audioContent,
      content: textContent,
      attachments,
      assistantId,
      publicApiKey,
      ...variables
    } = bodyResult

    const workspaceAccessWhere = await getWorkspaceAccessWhere({
      publicApiKey: publicApiKey ?? null,
      prisma,
    })

    if (!workspaceAccessWhere) {
      return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
    }

    if (!assistantId) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: 'No assistantId found.',
          workspaceId: await getWorkspaceId({ workspaceAccessWhere, prisma }),
        },
        prisma,
      })

      return NextResponse.json(
        { error: 'No assistantId found.' },
        { status: 400 },
      )
    }

    if (!textContent && !audioContent && !attachments?.length) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: 'No content found.',
          workspaceId: await getWorkspaceId({ workspaceAccessWhere, prisma }),
        },
        prisma,
      })

      return NextResponse.json({ error: 'No content found.' }, { status: 400 })
    }

    const assistant = await prisma.assistant.findFirst({
      where: {
        id: assistantId,
        workspace: workspaceAccessWhere,
      },
      include: {
        threads: {
          where: {
            id: validThreadId({ threadId: bodyResult.threadId ?? null }),
          },
          include: {
            assistant: {
              select: {
                storageProviderType: true,
              },
            },
          },
          take: 1,
        },
        workspace: {
          include: {
            modelProviders: true,
          },
        },
        mcpServers: {
          include: {
            computerUseTool: true,
            stdioTransport: true,
            sseTransport: true,
            httpTransport: true,
          },
        },
        tools: {
          include: {
            fileSearchTool: true,
            webSearchTool: true,
            imageGenerationTool: true,
            codeInterpreterTool: true,
            computerUseTool: {
              include: {
                mcpServer: {
                  include: {
                    stdioTransport: true,
                    sseTransport: true,
                    httpTransport: true,
                  },
                },
              },
            },
          },
        },
        functions: {
          include: {
            handler: {
              include: {
                requestHandler: true,
                firecrawlHandler: true,
                replicateHandler: true,
                clientToolHandler: true,
                assistantHandler: true,
                createTaskHandler: true,
                listTasksHandler: true,
                updateTaskHandler: true,
                deleteTaskHandler: true,
              },
            },
          },
        },
        modelProvider: true,
        initialMessages: {
          orderBy: {
            orderNumber: 'asc',
          },
        },
      },
    })

    if (!assistant) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: 'No assistant found.',
          workspaceId: await getWorkspaceId({ workspaceAccessWhere, prisma }),
        },
        prisma,
      })

      return NextResponse.json(
        { error: 'No assistant found.' },
        { status: 400 },
      )
    }

    if (
      isOpenaiAssistantsStorageProvider({
        storageProviderType: assistant.storageProviderType,
      }) &&
      !assistant.openaiAssistantId
    ) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: 'Assistant setup is not done.',
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
        },
        prisma,
      })

      return NextResponse.json(
        { error: 'Assistant setup is not done.' },
        { status: 400 },
      )
    }

    let thread = assistant.threads[0]
    let isThreadCreated = false

    if (!thread) {
      const createThreadClient = assistantClientAdapter({ assistant, prisma })

      try {
        thread = await createThread({
          client: createThreadClient,
          assistant,
          prisma,
          variables: variables as Record<string, string>,
        })

        onSuccessCreateThread({ thread })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error(error)
        createLog({
          log: {
            requestMethod: LogRequestMethod.POST,
            requestRoute: LogRequestRoute.MESSAGES,
            level: LogLevel.ERROR,
            status: 500,
            message: `Failed to create thread: ${error.message}`,
            workspaceId: assistant.workspaceId,
            assistantId: assistant.id,
          },
          prisma,
        })

        return NextResponse.json(
          { error: 'Failed to create thread.' },
          { status: 500 },
        )
      }

      isThreadCreated = true
    }

    let storageThreadId

    try {
      storageThreadId = getStorageThreadId({
        thread,
      })
    } catch (error) {
      console.error(error)
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: 'Failed to get storage thread id.',
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return NextResponse.json(
        { error: 'Failed to get storage thread id.' },
        { status: 500 },
      )
    }

    if (
      !storageThreadId &&
      (isOpenaiAssistantsStorageProvider({
        storageProviderType: assistant.storageProviderType,
      }) ||
        isResponsesStorageProvider({
          storageProviderType: assistant.storageProviderType,
        }))
    ) {
      try {
        storageThreadId = await managedOpenaiThreadId({
          assistant,
          threadId: thread.id,
          prisma,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        createLog({
          log: {
            requestMethod: LogRequestMethod.POST,
            requestRoute: LogRequestRoute.MESSAGES,
            level: LogLevel.ERROR,
            status: 500,
            message: `Failed to get managed openai thread id: ${error.message}`,
            workspaceId: assistant.workspaceId,
            assistantId: assistant.id,
            threadId: thread.id,
          },
          prisma,
        })

        return NextResponse.json(
          { error: 'Failed to get managed openai thread id.' },
          { status: 500 },
        )
      }
    }

    if (!storageThreadId) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: 'Invalid thread configuration.',
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return NextResponse.json(
        { error: 'Invalid thread configuration.' },
        { status: 500 },
      )
    }

    let content

    try {
      content = await getContent({
        audioContent,
        textContent,
        assistant,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error)
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Failed to get content: ${error.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return NextResponse.json(
        { error: 'Failed to get content.' },
        { status: 500 },
      )
    }

    const client = assistantClientAdapter({
      assistant,
      prisma,
      thread,
    })

    try {
      await client.beta.threads.messages.create(storageThreadId, {
        role: 'user',
        content,
        ...(attachments?.length ? { attachments } : {}),
        metadata: serializeMetadata({
          variables,
          workspaceId: assistant.workspaceId,
          prisma,
        }),
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log({ error })
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Failed to create message: ${error.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return NextResponse.json(
        { error: 'Failed to create message.' },
        { status: 500 },
      )
    }

    let createRunStream

    try {
      createRunStream = await client.beta.threads.runs.create(
        storageThreadId,
        await createRunOpts({ assistant, thread, prisma }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error)
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Failed to create run stream: ${serializeError({ error })}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return NextResponse.json(
        { error: 'Failed to create run stream.' },
        { status: 500 },
      )
    }

    let latestInProgressRunData: OpenAI.Beta.Threads.Runs.Run | null = null
    let latestCompletedRunData: OpenAI.Beta.Threads.Runs.Run | null = null

    return new Response(
      createMessageResponse({
        client,
        createRunStream,
        handleToolCall: handleToolCall({ assistant, thread, prisma }),
        onStart: ({
          controller,
        }: {
          controller: ReadableStreamDefaultController
        }) => {
          if (!isThreadCreated) return

          return enqueueJson({
            controller,
            value: {
              event: 'thread.created',
              data: serializeThread({
                thread,
              }),
            },
          })
        },
        onError: async ({ error }) => {
          if (request.signal.aborted) return

          createLog({
            log: {
              requestMethod: LogRequestMethod.POST,
              requestRoute: LogRequestRoute.MESSAGES,
              level: LogLevel.ERROR,
              status: 500,
              message: `Thread Run failed: ${error.message}`,
              workspaceId: assistant.workspaceId,
              assistantId: assistant.id,
              threadId: thread.id,
            },
            prisma,
          })

          // if (latestInProgressRunData) {
          //   await client.beta.threads.runs.cancel(
          //     latestInProgressRunData.thread_id,
          //     latestInProgressRunData.id,
          //   )
          // }
        },
        onEvent: ({ event, data }) => {
          if (event === 'thread.run.failed') {
            createLog({
              log: {
                requestMethod: LogRequestMethod.POST,
                requestRoute: LogRequestRoute.MESSAGES,
                level: LogLevel.ERROR,
                status: 500,
                message: `Thread Run failed: ${data.last_error?.message}`,
                workspaceId: assistant.workspaceId,
                assistantId: assistant.id,
                threadId: thread.id,
              },
              prisma,
            })
          } else if (event === 'thread.run.in_progress') {
            latestInProgressRunData = data
          } else if (event === 'thread.run.completed') {
            latestCompletedRunData = data
          }
        },
        onClose: async () => {
          if (latestCompletedRunData) return
          if (
            !isOpenaiAssistantsStorageProvider({
              storageProviderType: assistant.storageProviderType,
            })
          )
            return

          if (latestInProgressRunData) {
            await client.beta.threads.runs.cancel(latestInProgressRunData.id, {
              thread_id: latestInProgressRunData.thread_id,
            })
          }
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      },
    )
  }

export const POST = buildPOST({})

export const OPTIONS = () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )

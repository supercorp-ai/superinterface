import type { OpenAI } from 'openai'
import type {
  StorageProviderType,
  ModelProviderType,
  FirecrawlHandlerType,
  ReplicateHandlerType,
  ClientToolHandlerType,
  HandlerType,
  MethodType,
} from '@prisma/client'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

export type ModelProviderConfig = {
  slug: string
  type: ModelProviderType
  name: string
  logoUrl: string
  iconUrl: string
  dashboardUrl: string
  description: string
  modelSlugs: string[]
  storageProviderTypes: StorageProviderType[]
  isFunctionCallingAvailable: boolean
}

export type McpConnection = {
  client: Client
  transport: SSEClientTransport
}

export type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  byDay?: string[]
  byMonth?: number[]
  byHour?: number[]
  byMinute?: number[]
  bySecond?: number[]
  until?: string
  count?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export type HandlerInput = {
  type: HandlerType
  requestHandler?: {
    method: MethodType
    url: string
    headers: string
    body: string
  } | null
  firecrawlHandler?: {
    type: FirecrawlHandlerType
    apiKey: string
    body: string
  } | null
  assistantHandler?: {
    assistantId: string
  } | null
  replicateHandler?: {
    type: ReplicateHandlerType
    identifier: string
    apiKey: string
    body: string
  } | null
  clientToolHandler?: {
    type: ClientToolHandlerType
    name: string
    arguments: string
  } | null
  createTaskHandler?: {
    keyTemplate: string
  } | null
  listTasksHandler?: {
    keyTemplate: string
  } | null
  updateTaskHandler?: {
    keyTemplate: string
  } | null
  deleteTaskHandler?: {
    keyTemplate: string
  } | null
}

declare global {
  namespace PrismaJson {
    type MessageContent = OpenAI.Beta.Threads.Messages.MessageContent
    type MessageIncompleteDetails =
      OpenAI.Beta.Threads.Messages.Message['incomplete_details']
    type MessageMetadata = OpenAI.Beta.Threads.Messages.Message['metadata']
    type MessageToolCalls = OpenAI.Beta.Threads.Runs.ToolCall
    type MessageAttachment = OpenAI.Beta.Threads.Messages.Message.Attachment

    type RunRequiredAction = OpenAI.Beta.Threads.Runs.Run['required_action']
    type RunLastError = OpenAI.Beta.Threads.Runs.Run['last_error']
    type RunTools = OpenAI.Beta.Threads.Runs.Run['tools']
    type RunMetadata = OpenAI.Beta.Threads.Runs.Run['metadata']
    type RunUsage = OpenAI.Beta.Threads.Runs.Run['usage']
    type RunTruncationStrategy =
      OpenAI.Beta.Threads.Runs.Run['truncation_strategy']
    type RunResponseFormat = OpenAI.Beta.Threads.Runs.Run['response_format']

    type RunStepStepDetails =
      | OpenAI.Beta.Threads.Runs.MessageCreationStepDetails
      | OpenAI.Beta.Threads.Runs.ToolCallsStepDetails
    type RunStepLastErrorMessage =
      OpenAI.Beta.Threads.Runs.RunStep['last_error']
    type RunStepMetadata = OpenAI.Beta.Threads.Runs.RunStep['metadata']
    type RunStepUsage = OpenAI.Beta.Threads.Runs.RunStep['usage']

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type OpenapiSpec = Record<string, any>
    type RequestHandlerHeaders = Record<string, string>
    type RequestHandlerBody = Record<string, string>

    type FirecrawlHandlerBody = Record<string, string>
    type ReplicateHandlerBody = Record<string, string>
    type ClientToolHandlerArguments = Record<string, string>

    type HttpTransportHeaders = Record<string, string>
    type SseTransportHeaders = Record<string, string>

    type ThreadMetadata = Record<string, string>
    type TaskSchedule = {
      start: string
      due?: string
      recurrenceRules?: RecurrenceRule[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any
    }
  }
}

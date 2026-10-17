import type { Function as AssistantFunction } from '@prisma/client'
import type OpenAI from 'openai'

export const assistantFunctionTools = ({
  functions,
}: {
  functions: AssistantFunction[]
}) =>
  functions.map((fn) => ({
    type: 'function' as const,
    function: fn.openapiSpec as unknown as OpenAI.FunctionDefinition,
  }))

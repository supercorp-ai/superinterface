import type OpenAI from 'openai'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const serializeMcpFunctionTool = ({ tool }: { tool: Tool }) =>
  ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }) as OpenAI.Beta.Assistants.AssistantTool

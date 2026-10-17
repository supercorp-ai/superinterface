import {
  CallToolResultSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js'
import type { McpConnection } from '@/types'
import { COMPUTER_CALL_TIMEOUT_MS, COMPUTER_CALL_TOOL_NAME } from './constants'

export type ComputerAction = Record<string, unknown>

export const callComputerAction = async ({
  mcpConnection,
  action,
}: {
  mcpConnection: McpConnection
  action: ComputerAction
}) =>
  (await mcpConnection.client.callTool(
    {
      name: COMPUTER_CALL_TOOL_NAME,
      arguments: { action },
    },
    CallToolResultSchema,
    {
      timeout: COMPUTER_CALL_TIMEOUT_MS,
    },
  )) as CallToolResult

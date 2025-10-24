// import { v4 as uuidv4 } from 'uuid'
import type { McpConnection } from '@/types'

export const closeMcpConnection = async ({
  mcpConnection,
}: {
  mcpConnection: McpConnection
}) => {
  // await mcpConnection.transport.send({
  //   id: `close-${uuidv4()}`,
  //   jsonrpc: '2.0',
  //   method: 'ping',
  // })
  await mcpConnection.client.close()
  await mcpConnection.transport.close()
}

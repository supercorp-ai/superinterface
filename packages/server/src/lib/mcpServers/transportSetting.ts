import { TransportType } from '@prisma/client'
import type { RemoteMcpServer } from './remoteMcpServer'

type TransportField = 'url' | 'headers'

type Transport = NonNullable<RemoteMcpServer['httpTransport']>

// Reads a setting of the server's HTTP or SSE transport, or the fallback for
// servers without one. Every HTTP and SSE server is created with its
// transport.
export const transportSetting = <Field extends TransportField, Fallback>({
  mcpServer,
  field,
  fallback,
}: {
  mcpServer: RemoteMcpServer
  field: Field
  fallback: Fallback
}): Transport[Field] | Fallback => {
  if (mcpServer.transportType === TransportType.HTTP) {
    return mcpServer.httpTransport![field]
  }

  if (mcpServer.transportType === TransportType.SSE) {
    return mcpServer.sseTransport![field]
  }

  return fallback
}

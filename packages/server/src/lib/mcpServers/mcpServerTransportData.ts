import { TransportType } from '@prisma/client'

type Transport = { url: string; headers: string }

type NestedTransport<Operation extends 'create' | 'update'> = Record<
  Operation,
  { url: string; headers: Record<string, string> }
>

// Nests the transport of the server's transport type under a Prisma create
// or update. mcpServerSchema only accepts SSE and HTTP transports and
// requires the one matching the transport type.
export const mcpServerTransportData = <Operation extends 'create' | 'update'>({
  transportType,
  sseTransport,
  httpTransport,
  operation,
}: {
  transportType: TransportType
  sseTransport?: Transport | null
  httpTransport?: Transport | null
  operation: Operation
}) => {
  const nested = (transport: Transport) =>
    ({
      [operation]: {
        url: transport.url,
        headers: JSON.parse(transport.headers),
      },
    }) as NestedTransport<Operation>

  if (transportType === TransportType.SSE) {
    return { sseTransport: nested(sseTransport!) }
  }

  return { httpTransport: nested(httpTransport!) }
}

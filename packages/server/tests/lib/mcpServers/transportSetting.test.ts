import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TransportType } from '@prisma/client'
import { transportSetting } from '@/lib/mcpServers/transportSetting'
import type { RemoteMcpServer } from '@/lib/mcpServers/remoteMcpServer'

const mcpServer = (fields: Record<string, unknown>) =>
  fields as unknown as RemoteMcpServer

test('transportSetting reads the setting of the HTTP or SSE transport', () => {
  const headers = { authorization: 'Bearer {{token}}' }

  assert.equal(
    transportSetting({
      mcpServer: mcpServer({
        transportType: TransportType.HTTP,
        httpTransport: { url: 'https://http.test' },
      }),
      field: 'url',
      fallback: '',
    }),
    'https://http.test',
  )
  assert.equal(
    transportSetting({
      mcpServer: mcpServer({
        transportType: TransportType.SSE,
        sseTransport: { headers },
      }),
      field: 'headers',
      fallback: {},
    }),
    headers,
  )
})

test('transportSetting returns the fallback for servers without an HTTP or SSE transport', () => {
  const fallback = {}

  assert.equal(
    transportSetting({
      mcpServer: mcpServer({ transportType: TransportType.STDIO }),
      field: 'headers',
      fallback,
    }),
    fallback,
  )
  assert.equal(
    transportSetting({
      mcpServer: mcpServer({ transportType: TransportType.STDIO }),
      field: 'url',
      fallback: '',
    }),
    '',
  )
})

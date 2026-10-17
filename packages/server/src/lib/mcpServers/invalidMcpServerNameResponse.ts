import { NextResponse } from 'next/server'

export const invalidMcpServerNameResponse = () =>
  NextResponse.json(
    {
      error:
        'Invalid MCP server name. Use letters, numbers, spaces, or hyphens.',
    },
    { status: 400 },
  )

import { NextResponse } from 'next/server'

export const noMcpServerFoundResponse = () =>
  NextResponse.json({ error: 'No MCP server found' }, { status: 400 })

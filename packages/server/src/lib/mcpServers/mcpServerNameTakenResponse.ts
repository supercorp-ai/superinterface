import { NextResponse } from 'next/server'

export const mcpServerNameTakenResponse = () =>
  NextResponse.json(
    { error: 'An MCP server with that name already exists.' },
    { status: 400 },
  )

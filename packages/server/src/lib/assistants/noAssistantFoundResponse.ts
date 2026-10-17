import { NextResponse } from 'next/server'

export const noAssistantFoundResponse = () =>
  NextResponse.json({ error: 'No assistant found' }, { status: 400 })

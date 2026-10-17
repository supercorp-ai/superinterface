import { NextResponse } from 'next/server'

export const invalidPayloadResponse = () =>
  NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

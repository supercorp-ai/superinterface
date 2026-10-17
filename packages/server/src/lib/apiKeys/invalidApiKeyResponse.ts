import { NextResponse } from 'next/server'

export const invalidApiKeyResponse = () =>
  NextResponse.json({ error: 'Invalid api key' }, { status: 400 })

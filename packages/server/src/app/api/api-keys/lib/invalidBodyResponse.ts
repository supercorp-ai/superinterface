import { NextResponse } from 'next/server'

export const invalidBodyResponse = () =>
  NextResponse.json({ error: 'Invalid body' }, { status: 400 })

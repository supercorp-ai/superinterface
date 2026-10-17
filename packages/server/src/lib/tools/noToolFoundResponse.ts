import { NextResponse } from 'next/server'

export const noToolFoundResponse = () =>
  NextResponse.json({ error: 'No tool found' }, { status: 400 })

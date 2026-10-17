import { NextResponse } from 'next/server'

export const noFunctionFoundResponse = () =>
  NextResponse.json({ error: 'No function found' }, { status: 400 })

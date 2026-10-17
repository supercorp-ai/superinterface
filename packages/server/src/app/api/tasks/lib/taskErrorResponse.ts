import { NextResponse } from 'next/server'

export const taskErrorResponse = ({ error }: { error: string }) =>
  NextResponse.json({ error }, { status: 400 })

import { NextResponse } from 'next/server'

export const badRequestResponse = ({ error }: { error: string }) =>
  NextResponse.json({ error }, { status: 400 })

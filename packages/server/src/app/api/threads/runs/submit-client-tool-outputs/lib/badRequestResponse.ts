import { NextResponse } from 'next/server'

const BAD_REQUEST_STATUS = 400

export const badRequestResponse = ({ error }: { error: string }) =>
  NextResponse.json({ error }, { status: BAD_REQUEST_STATUS })

import { NextResponse } from 'next/server'

export const ignoredDeliveryResponse = ({ reason }: { reason: string }) =>
  NextResponse.json({ ok: true, ignored: reason })

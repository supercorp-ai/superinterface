import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'

export const corsOptionsResponse = () =>
  NextResponse.json({}, { headers: cacheHeaders })

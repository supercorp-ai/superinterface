import type { Workspace } from '@prisma/client'
import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeApiWorkspace } from '@/lib/workspaces/serializeApiWorkspace'

export const workspaceResponse = ({ workspace }: { workspace: Workspace }) =>
  NextResponse.json(
    { workspace: serializeApiWorkspace({ workspace }) },
    { headers: cacheHeaders },
  )

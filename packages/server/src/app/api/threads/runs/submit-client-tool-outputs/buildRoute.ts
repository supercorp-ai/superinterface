import { NextRequest, NextResponse } from 'next/server'
import { type PrismaClient } from '@prisma/client'
import { authorizeSubmitAssistant } from './lib/authorizeSubmitAssistant'
import { badRequestResponse } from './lib/badRequestResponse'
import { storeClientToolOutput } from './lib/storeClientToolOutput'
import type { SubmitClientToolOutputsBody } from './lib/submitClientToolOutputsBody'

const SUCCESS_STATUS = 'success'

export const buildPOST =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest) => {
    const {
      assistantId,
      publicApiKey,
      toolOutputs,
    }: SubmitClientToolOutputsBody = await request.json()

    const authorized = await authorizeSubmitAssistant({
      prisma,
      publicApiKey,
      assistantId,
    })

    if (authorized.errorResponse) return authorized.errorResponse

    if (!Array.isArray(toolOutputs)) {
      return badRequestResponse({ error: 'Invalid tool outputs' })
    }

    await Promise.all(
      toolOutputs.map((toolOutput) => storeClientToolOutput({ toolOutput })),
    )

    return NextResponse.json({ status: SUCCESS_STATUS })
  }

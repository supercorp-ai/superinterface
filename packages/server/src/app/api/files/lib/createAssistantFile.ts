import type OpenAI from 'openai'
import type { PrismaClient } from '@prisma/client'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { fileExpiresAfter } from './fileExpiresAfter'
import type { FileAssistant } from './findFileAssistant'

// Uploads the file to the assistant's storage provider, for the assistants
// purpose unless another one is given.
export const createAssistantFile = ({
  assistant,
  prisma,
  file,
  purpose,
}: {
  assistant: FileAssistant
  prisma: PrismaClient
  file: FormDataEntryValue
  purpose: FormDataEntryValue | null
}) => {
  const assistantClient = assistantClientAdapter({ assistant, prisma })

  return assistantClient.files.create({
    // @ts-expect-error file is Uploadable
    file,
    purpose: (purpose as OpenAI.FilePurpose | null) ?? 'assistants',
    ...fileExpiresAfter({ storageProviderType: assistant.storageProviderType }),
  })
}

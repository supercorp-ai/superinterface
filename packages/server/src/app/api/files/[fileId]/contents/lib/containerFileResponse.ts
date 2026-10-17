import type OpenAI from 'openai'
import { fileContentResponse } from './fileContentResponse'

// Streams a file from a code interpreter container.
export const containerFileResponse = async ({
  assistantClient,
  fileId,
  containerId,
}: {
  assistantClient: OpenAI
  fileId: string
  containerId: string
}) => {
  const { containers } = assistantClient
  const response = await containers.files.content.retrieve(fileId, {
    container_id: containerId,
  })

  return fileContentResponse({
    body: response.body,
    upstreamHeaders: response.headers,
  })
}

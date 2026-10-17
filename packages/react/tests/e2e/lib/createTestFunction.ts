import { apiRequest } from './apiRequest'

// Adds a function the model can call to an assistant through the public API,
// e.g. `handler: { type: 'REQUEST', requestHandler: { method, url, ... } }`.
export const createTestFunction = async ({
  privateKey,
  assistantId,
  name,
  parameters = { type: 'object', properties: {} },
  handler,
}: {
  privateKey: string
  assistantId: string
  name: string
  parameters?: Record<string, unknown>
  handler: Record<string, unknown>
}) => {
  const { function: created } = await apiRequest({
    path: `/assistants/${assistantId}/functions`,
    apiKey: privateKey,
    body: {
      openapiSpec: JSON.stringify({
        name,
        description: `The ${name} function.`,
        parameters,
      }),
      handler,
    },
  })

  return created
}

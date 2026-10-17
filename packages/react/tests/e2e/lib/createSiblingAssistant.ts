import { apiRequest } from './apiRequest'

// Creates another assistant in the same workspace and on the same model
// provider as `assistant`, e.g. to be called by an ASSISTANT function.
export const createSiblingAssistant = async ({
  privateKey,
  assistant,
  name = 'E2E Sibling Assistant',
}: {
  privateKey: string
  assistant: { modelProviderId: string }
  name?: string
}) => {
  const { assistant: created } = await apiRequest({
    path: '/assistants',
    apiKey: privateKey,
    body: {
      storageProviderType: 'SUPERINTERFACE_CLOUD',
      modelProviderId: assistant.modelProviderId,
      model: 'fake-model',
      name,
    },
  })

  return created
}

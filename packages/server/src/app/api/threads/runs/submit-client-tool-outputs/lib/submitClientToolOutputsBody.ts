import type { ClientToolOutput } from './clientToolOutput'

// The request body as sent; every field is checked before it is used.
export type SubmitClientToolOutputsBody = {
  assistantId?: string
  publicApiKey?: string
  toolOutputs?: ClientToolOutput[]
}

import { failToolCall, type FailToolCallArgs } from './failToolCall'

// Logs a tool call the model sent unusable input for as a 400 Bad Request and
// returns the tool output sent back to the model.
export const rejectToolCall = (args: Omit<FailToolCallArgs, 'status'>) =>
  failToolCall({ ...args, status: 400 })

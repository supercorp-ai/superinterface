import type { ComputerAction } from './handleComputerCall/callComputerAction'
import { isRecord } from './isRecord'

// Pass through any object-shaped action to the MCP server. The MCP
// (in loose mode) is the authority on what's a valid action — it
// handles canonical shapes, small-model drift (`{keys:[...]}` without
// `type`, `type` placed as a wrapper sibling, natural-language verbs,
// chord expansion, etc.) and rejects junk with `isError:true`.
// Previously this guard also required `typeof value.type === 'string'`,
// which silently filtered out drifted shapes from gemma-4 & similar
// local models and surfaced them as "No computer actions provided",
// sending the model into an endless retry loop.
export const isComputerAction = (value: unknown): value is ComputerAction =>
  isRecord(value)

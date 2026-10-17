import { interpolateFunctionValue } from '../../interpolateFunctionValue'
import type { FilledTemplate, RequestTemplate } from './types'

// Fills the templates in each of the handler's headers.
export const buildRequestHeaders = ({
  requestHandler,
  args,
  thread,
  assistant,
}: RequestTemplate): FilledTemplate<Record<string, string>> => {
  const result: Record<string, string> = {}
  const missing: string[] = []

  for (const [k, v] of Object.entries(requestHandler.headers)) {
    const res = interpolateFunctionValue({ value: v, args, thread, assistant })
    result[k] = res.value
    missing.push(...res.missing)
  }

  return { value: result, missing }
}

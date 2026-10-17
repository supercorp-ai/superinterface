import { MethodType } from '@prisma/client'
import { interpolateFunctionValue } from '../../interpolateFunctionValue'
import { withQueryParams } from './withQueryParams'
import type { FilledTemplate, RequestTemplate } from './types'

// Fills the URL template and, for GET requests, sends the arguments as query
// params.
export const buildRequestUrl = ({
  requestHandler,
  args,
  thread,
  assistant,
}: RequestTemplate): FilledTemplate<string> => {
  const { value, missing } = interpolateFunctionValue({
    value: requestHandler.url,
    args,
    thread,
    assistant,
  })

  if (requestHandler.method !== MethodType.GET) {
    return { value, missing }
  }

  if (!args || !Object.keys(args).length) {
    return { value, missing }
  }

  return { value: withQueryParams({ url: value, args }), missing }
}

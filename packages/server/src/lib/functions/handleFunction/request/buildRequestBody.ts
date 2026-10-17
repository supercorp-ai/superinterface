import { MethodType } from '@prisma/client'
import { interpolateFunctionValue } from '../../interpolateFunctionValue'
import type { FunctionArguments } from '../parseFunctionArguments'
import type { FilledTemplate, RequestTemplate } from './types'

// Merges the arguments over the handler's body, filling string templates in
// the body fields the arguments don't override. GET requests have no body.
export const buildRequestBody = ({
  requestHandler,
  args,
  thread,
  assistant,
}: RequestTemplate): FilledTemplate<FunctionArguments | undefined> => {
  if (requestHandler.method === MethodType.GET) {
    return { value: undefined, missing: [] }
  }

  const body: FunctionArguments = { ...requestHandler.body, ...args }
  const missing: FilledTemplate<string>['missing'] = []

  for (const [field, template] of Object.entries(requestHandler.body)) {
    if (field in (args || {})) continue
    if (typeof template !== 'string') continue

    const filled = interpolateFunctionValue({
      value: template,
      args,
      thread,
      assistant,
    })
    body[field] = filled.value
    missing.push(...filled.missing)
  }

  return { value: body, missing }
}

import { merge } from 'lodash'

type DefaultValueArg = any
type ContextValueArg = any
type IncomingValueArg = any

export const mergeOptions = (defaultValue: DefaultValueArg, contextValue: ContextValueArg, incomingValue: IncomingValueArg) => {
  if (!incomingValue) {
    return merge(defaultValue, contextValue)
  }

  if (typeof contextValue === 'function') {
    return merge(defaultValue, contextValue(incomingValue))
  }

  return merge(defaultValue, contextValue, incomingValue)
}

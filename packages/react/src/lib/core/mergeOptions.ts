import { mapValues, partob } from 'radash'
import { merge } from 'lodash'

type DefaultValueArg = any
type ContextValueArg = any
type IncomingValueArg = any

const getResult = (defaultValue: DefaultValueArg, contextValue: ContextValueArg, incomingValue: IncomingValueArg) => {
  if (!incomingValue) {
    return merge(defaultValue, contextValue)
  }

  if (typeof contextValue === 'function') {
    return merge(defaultValue, contextValue(incomingValue))
  }

  // console.log({ defaultValue, contextValue, incomingValue })
  return merge(defaultValue, contextValue, incomingValue)
}

export const mergeOptions = (defaultValue: DefaultValueArg, contextValue: ContextValueArg, incomingValue: IncomingValueArg) => {
  const options = getResult(defaultValue, contextValue, incomingValue)

  return mapValues(options, (value) => {
    if (typeof value === 'function') {
      return partob(value, { options })
    }

    return value
  })
}

import _ from 'lodash'

// @ts-ignore-next-line
export const customizer = (objectValue, srcValue, key) => {
  // Handle arrays: replace instead of merge
  if (_.isArray(objectValue)) {
    return srcValue
  }

  // Handle React refs: preserve object identity
  // Refs are objects with a 'current' property and typically have 'Ref' in the key name
  if (
    srcValue &&
    typeof srcValue === 'object' &&
    'current' in srcValue &&
    typeof key === 'string' &&
    key.toLowerCase().includes('ref')
  ) {
    // Return the source ref directly to preserve its identity
    return srcValue
  }

  // Let lodash handle other cases
  return undefined
}

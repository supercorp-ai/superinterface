import _ from 'lodash'

// @ts-expect-error broad type
export const customizer = (objectValue, srcValue) => {
  if (!_.isArray(objectValue)) return

  return srcValue
}

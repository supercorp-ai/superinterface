import _ from 'lodash'

// @ts-ignore-next-line
export const customizer = (objectValue, srcValue) => {
  if (!_.isArray(objectValue)) return

  return srcValue
}

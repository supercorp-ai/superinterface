import _ from 'lodash'
import { customizer } from './customizer'

// @ts-expect-error broad type
export const merge = (obj, ...sources) =>
  _.mergeWith(_.cloneDeep(obj), ...sources, customizer)

import _ from 'lodash'
import { customizer } from './customizer'

// @ts-ignore-next-line
export const merge = (obj, ...sources) =>
  _.mergeWith(_.cloneDeep(obj), ...sources, customizer)

import type { ThreadStorageOptions } from '@/types'
import { get } from './get'
import { set } from './set'
import { remove } from './remove'

export const cookieOptions: ThreadStorageOptions = {
  get,
  set,
  remove,
}

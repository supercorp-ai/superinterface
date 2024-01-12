import { onMutate } from './onMutate'
import { onError } from './onError'
import { onSettled } from './onSettled'

export const mutationOptions = {
  onMutate,
  onError,
  onSettled,
}

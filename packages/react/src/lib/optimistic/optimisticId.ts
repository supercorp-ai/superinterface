import { uid } from 'radash'

export const optimisticId = () => (
  `-${uid(24)}`
)

import _ from 'lodash'

type Args = {
  id: string
}

export const isOptimistic = ({
  id,
}: Args) => (
  _.startsWith(id, '-')
)

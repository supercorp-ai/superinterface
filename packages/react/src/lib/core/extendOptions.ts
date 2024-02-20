import { mapValues } from 'radash'
import { merge } from 'lodash'
import { fillOption } from '@/lib/core/fillOption'

type Args = {
  defaultOptions: any
  args: any
  meta: any
}

type FillArgs = {
  options: any
  args: any
  meta: any
}

const fill = ({ options, meta, args }: FillArgs) => (
  mapValues(options, (value, key: string) => {
    if (key === 'onMutate') {
      return async (...args: any) => {
        // @ts-ignore-next-line
        return value(...args, { meta })
      }
    }


    return fillOption({
      value,
      key,
      meta,
      args,
    })
  })
)

export const extendOptions = ({
  defaultOptions,
  args,
  meta,
}: Args) => {
  // return merge(context.defaultOptions,
  // )
  const options = merge(defaultOptions, args)

  return {
    meta,
    ...fill({ options, meta, args }),
  }
}

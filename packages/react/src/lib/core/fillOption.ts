const extended = [
  'enabled',
  'queryKey',
  'mutationKey',
]

export const fillOption = ({
  value,
  key,
  meta,
  args,
}: any) => {
  if (typeof value === 'function' && extended.includes(key)) {
    return value({
      meta,
      ...args
    })
  }

  return value
}

import type { FunctionArguments } from '../parseFunctionArguments'

// Adds the arguments to the URL's query, replacing params of the same name.
// Array values become repeated params.
export const withQueryParams = ({
  url,
  args,
}: {
  url: string
  args: FunctionArguments
}) => {
  const [path, existingQuery = ''] = url.split('?')
  const params = new URLSearchParams(existingQuery)

  Object.entries(args).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      // Replace existing key with multiple values
      params.delete(k)
      for (const item of v) {
        params.append(k, String(item))
      }
    } else {
      params.set(k, String(v))
    }
  })

  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

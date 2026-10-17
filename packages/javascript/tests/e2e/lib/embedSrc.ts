import { staticBaseUrl } from './staticBaseUrl'

// The URL of a built embed on the static server, with its configuration in
// the query string like a customer's script tag. With `scriptTagId` the
// bundle is served from the hosted script tag path `/script-tags/<id>`.
export const embedSrc = ({
  bundle,
  params = {},
  scriptTagId,
}: {
  bundle: string
  params?: Record<string, string>
  scriptTagId?: string
}) => {
  const pathname = scriptTagId
    ? `/script-tags/${bundle}~${scriptTagId}`
    : `/dist/${bundle}.global.js`
  const url = new URL(pathname, staticBaseUrl())

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return url.toString()
}

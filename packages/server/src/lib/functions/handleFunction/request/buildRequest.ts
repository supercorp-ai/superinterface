import { buildRequestUrl } from './buildRequestUrl'
import { buildRequestBody } from './buildRequestBody'
import { buildRequestHeaders } from './buildRequestHeaders'
import type { RequestTemplate } from './types'

const JSON_CONTENT_TYPE = 'application/json'

// Builds the fetch URL and options from the request handler, listing the
// template variables that could not be filled.
export const buildRequest = (template: RequestTemplate) => {
  const url = buildRequestUrl(template)
  const body = buildRequestBody(template)
  const headers = buildRequestHeaders(template)

  return {
    url: url.value,
    init: {
      method: template.requestHandler.method,
      headers: {
        Accept: JSON_CONTENT_TYPE,
        'Content-Type': JSON_CONTENT_TYPE,
        ...headers.value,
      },
      body: body.value ? JSON.stringify(body.value) : undefined,
    },
    missing: [...url.missing, ...body.missing, ...headers.missing],
  }
}

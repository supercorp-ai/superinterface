import { postServerApi } from './postServerApi'

// Adds a function to the assistant that the server handles by sending a GET
// request to `url`, through the server's public API.
export const createRequestFunction = ({
  assistantId,
  privateKey,
  name,
  url,
}: {
  assistantId: string
  privateKey: string
  name: string
  url: string
}) =>
  postServerApi({
    path: `/assistants/${assistantId}/functions`,
    apiKey: privateKey,
    body: {
      openapiSpec: JSON.stringify({
        name,
        description: `Calls ${name}`,
        parameters: {
          type: 'object',
          properties: { city: { type: 'string' } },
        },
      }),
      handler: {
        type: 'REQUEST',
        requestHandler: {
          method: 'GET',
          url,
          headers: '{}',
          body: '{}',
        },
      },
    },
  })

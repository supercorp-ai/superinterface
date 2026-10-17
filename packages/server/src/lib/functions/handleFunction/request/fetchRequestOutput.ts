import { readResponseOutput } from './readResponseOutput'
import type { RequestFailure } from './types'

type RequestOutcome =
  | { ok: true; output: string }
  | ({ ok: false } & RequestFailure)

// Sends the request and reads its response as the tool output.
export const fetchRequestOutput = async ({
  url,
  init,
}: {
  url: string
  init: RequestInit
}): Promise<RequestOutcome> => {
  let response

  try {
    response = await fetch(url, init)
  } catch (e) {
    // fetch rejects with TypeError instances.
    return {
      ok: false,
      reason: 'Request failed',
      errorMessage: (e as TypeError).message,
    }
  }

  try {
    return { ok: true, output: await readResponseOutput({ response }) }
  } catch (e) {
    // Reading or parsing the body rejects with TypeError or SyntaxError.
    return {
      ok: false,
      reason: 'Failed parsing request response',
      errorMessage: (e as Error).message,
    }
  }
}

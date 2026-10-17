import type { NextRequest, NextResponse } from 'next/server'

type Authorization =
  | { errorResponse: NextResponse; where?: undefined }
  | { where: object; errorResponse?: undefined }

// Builds a route handler that authorizes the request from its route params
// first, answering with the authorization's error response when it fails and
// handing the authorized where clause to the handler otherwise.
export const authorizedRouteHandler =
  <Params, Result extends Authorization, HandlerResponse>({
    authorize,
    handle,
  }: {
    authorize: (params: Params) => Promise<Result>
    handle: (args: {
      request: NextRequest
      params: Params
      where: NonNullable<Result['where']>
    }) => Promise<HandlerResponse>
  }) =>
  async (request: NextRequest, props: { params: Promise<Params> }) => {
    const params = await props.params
    const { where, errorResponse } = await authorize(params)

    if (errorResponse) return errorResponse

    return handle({ request, params, where: where! })
  }

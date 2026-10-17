import { NextResponse } from 'next/server'
import { validate } from 'uuid'

// The error response for the first id that is not a uuid, if any.
export const invalidIdsResponse = ({
  ids,
}: {
  ids: { id: string; error: string }[]
}) => {
  const invalidId = ids.find(({ id }) => !validate(id))

  return (
    invalidId && NextResponse.json({ error: invalidId.error }, { status: 400 })
  )
}

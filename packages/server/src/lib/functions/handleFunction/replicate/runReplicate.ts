import type { ReplicateHandler } from '@prisma/client'
import Replicate from 'replicate'
import { merge } from '@/lib/misc/merge'
import type { FunctionArguments } from '../parseFunctionArguments'

type ModelIdentifier = `${string}/${string}`

// Runs the handler's Replicate model with the handler's body merged with the
// model's arguments.
export const runReplicate = ({
  replicateHandler: { apiKey, identifier, body },
  args,
}: {
  replicateHandler: ReplicateHandler
  args: FunctionArguments
}) => {
  const replicate = new Replicate({
    auth: apiKey,
    useFileOutput: false,
  })

  return replicate.run(identifier as ModelIdentifier, merge(body, args))
}

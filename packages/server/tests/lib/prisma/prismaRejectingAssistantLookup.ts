import type { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const bound = ({
  target,
  property,
}: {
  target: object
  property: string | symbol
}) => {
  const value = Reflect.get(target, property)
  return typeof value === 'function' ? value.bind(target) : value
}

// A PrismaClient (as accepted by the route builders) that behaves like the
// shared test client, except that `assistant.findUnique` for `assistantId`
// rejects with `error`. Lets a test simulate a custom client that fails in
// unusual ways, e.g. rejecting with a non-Error value.
export const prismaRejectingAssistantLookup = ({
  assistantId,
  error,
}: {
  assistantId: string
  error: unknown
}) =>
  new Proxy(prisma, {
    get: (target, property) => {
      if (property !== 'assistant') return bound({ target, property })

      return new Proxy(target.assistant, {
        get: (delegate, method) => {
          if (method !== 'findUnique') {
            return bound({ target: delegate, property: method })
          }

          return (args: { where: { id?: string } }) =>
            args.where.id === assistantId
              ? Promise.reject(error)
              : delegate.findUnique(
                  args as Parameters<typeof delegate.findUnique>[0],
                )
        },
      })
    },
  }) as PrismaClient

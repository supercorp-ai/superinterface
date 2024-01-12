import { Args as NewMessageArgs } from './mutationFn'

type Context = {
  prevMessages: any
} | undefined

export const onError = async (
  _error: any,
  newMessage: NewMessageArgs,
  context: Context
) => {
  if (!context) {
    return
  }

  // TODO
}

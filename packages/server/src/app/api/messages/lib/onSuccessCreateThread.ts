import type { Thread } from '@prisma/client'

// Lets the embedding app react to a thread created for a new message.
export type OnSuccessCreateThread = ({
  thread,
}: {
  thread: Thread
}) => void | Promise<void>

const QSTASH_MESSAGE_ID_HEADER = 'upstash-message-id'

// The task a callback delivers and the QStash message that delivered it.
export type TaskCallback = {
  taskId: string
  incomingMessageId: string | null
}

export const readTaskCallback = async ({
  request,
}: {
  request: Request
}): Promise<TaskCallback> => {
  const { taskId } = await request.json()

  return {
    taskId,
    incomingMessageId: request.headers.get(QSTASH_MESSAGE_ID_HEADER),
  }
}

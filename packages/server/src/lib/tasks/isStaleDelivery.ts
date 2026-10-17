// A delivery is stale once the task was rescheduled under another message.
export const isStaleDelivery = ({
  incomingMessageId,
  currentMessageId,
}: {
  incomingMessageId: string | null
  currentMessageId: string | null
}) => Boolean(incomingMessageId && incomingMessageId !== currentMessageId)

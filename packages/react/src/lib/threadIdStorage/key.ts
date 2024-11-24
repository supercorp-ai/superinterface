export const key = ({
  assistantId,
}: {
  assistantId: string
}) => (
  `superinterface-${assistantId}-threadId`
)

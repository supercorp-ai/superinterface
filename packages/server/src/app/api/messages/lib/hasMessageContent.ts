export const hasMessageContent = ({
  textContent,
  audioContent,
  attachments,
}: {
  textContent: unknown
  audioContent: unknown
  attachments: unknown[] | undefined
}) => Boolean(textContent || audioContent || attachments?.length)

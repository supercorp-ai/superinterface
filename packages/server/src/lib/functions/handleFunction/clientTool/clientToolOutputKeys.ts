// Redis keys shared with the submit-client-tool-outputs route.
export type ClientToolOutputKeys = {
  // Marks the client tool call as awaiting output.
  pending: string
  // Holds the output the client submitted.
  output: string
}

export const clientToolOutputKeys = ({
  toolCallId,
}: {
  toolCallId: string
}): ClientToolOutputKeys => ({
  pending: `submit-client-tool-outputs:pending:${toolCallId}`,
  output: `submit-client-tool-outputs:output:${toolCallId}`,
})

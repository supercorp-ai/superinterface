import OpenAI from 'openai'

export type AssistantArguments = {
  message: string
}

type ParsedAssistantArguments =
  | { ok: true; args: AssistantArguments }
  | { ok: false; errorMessage: string }

export const parseAssistantArguments = ({
  toolCall,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
}): ParsedAssistantArguments => {
  try {
    return { ok: true, args: JSON.parse(toolCall.function.arguments) }
  } catch (e) {
    // JSON.parse only throws SyntaxError instances.
    return { ok: false, errorMessage: (e as SyntaxError).message }
  }
}

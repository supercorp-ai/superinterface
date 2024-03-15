import { createAI } from "ai/rsc"

const submitUserMessage = async (message: string) => {
  console.log(message)
  return {}
}

export const AI = createAI({
  actions: {
    submitUserMessage
  },
  initialUIState: [],
  initialAIState: [],
})

import OpenAI from 'openai'
import { Message } from '@superinterface/react/types'

export const threadRunStepCreated = ({
  value,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadRunStepCreated
}) => (prevData: any) => {
  if (!prevData) return prevData

  const [latestPage, ...pagesRest] = prevData.pages

  return {
    ...prevData,
    pages: [
      {
        ...latestPage,
        data: latestPage.data.map((m: Message) => {
          if (m.run_id === value.data.run_id) {
            return {
              ...m,
              runSteps: [
                value.data,
                ...m.runSteps,
              ],
            }
          }

          return m
        }),
      },
      ...pagesRest,
    ],
  }
}

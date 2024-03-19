import OpenAI from 'openai'
import { RunStep, Message } from '@superinterface/react/types'
import { replace } from 'radash'

export const threadRunStepCompleted = ({
  value,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadRunStepCompleted
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
              runSteps: replace(m.runSteps, value.data, (rs: RunStep) => rs.id === value.data.id),
            }
          }

          return m
        }),
      },
      ...pagesRest,
    ],
  }
}

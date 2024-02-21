import OpenAI from 'openai'

export type ThreadMessage = OpenAI.Beta.Threads.Messages.ThreadMessage & {
  runSteps: OpenAI.Beta.Threads.Runs.RunStep[]
}

export type ThreadMessagesPage = {
  data: ThreadMessage[]
  hasNextPage: boolean
  lastId: string
}

export type RunStepsPage = {
  data: OpenAI.Beta.Threads.Runs.RunStep[]
  hasNextPage: boolean
  lastId: string
}

export type ThreadMessageGroup = {
  id: string
  role: "user" | "assistant"
  threadMessages: ThreadMessage[]
  createdAt: number
}

export type Run = OpenAI.Beta.Threads.Runs.Run

export type RunsPage = {
  data: Run[]
  hasNextPage: boolean
  lastId: string
}

type Fn = (args: any) => Promise<string>

export type Functions = {
  [key: string]: Fn
}

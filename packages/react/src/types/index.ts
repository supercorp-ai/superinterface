import OpenAI from 'openai'

export type Message = OpenAI.Beta.Threads.Messages.ThreadMessage & {
  runSteps: OpenAI.Beta.Threads.Runs.RunStep[]
}

export type MessagesPage = {
  data: Message[]
  hasNextPage: boolean
  lastId: string
}

export type RunStepsPage = {
  data: OpenAI.Beta.Threads.Runs.RunStep[]
  hasNextPage: boolean
  lastId: string
}

export type MessageGroup = {
  id: string
  role: "user" | "assistant"
  messages: Message[]
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

export type AudioEngine = {
  source: MediaStreamAudioSourceNode | GainNode
  audioContext: AudioContext
}

import OpenAI from 'openai'

export type RunStep = OpenAI.Beta.Threads.Runs.RunStep

export type Message = OpenAI.Beta.Threads.Messages.Message & {
  runSteps: RunStep[]
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

export type Toast = {
  type: 'success' | 'error'
  message: string
}

export type AudioStreamEvent = {
  event: 'audio.delta' | 'audio.completed'
  data: string
}

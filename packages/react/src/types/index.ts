import OpenAI from 'openai'
import { AvatarType, IconAvatarName } from '@/lib/enums'

export type SerializedRunStep = Pick<OpenAI.Beta.Threads.Runs.RunStep, 'id' | 'run_id' | 'step_details' | 'completed_at' | 'cancelled_at' | 'failed_at' | 'status'>

export type SerializedMessage = Pick<OpenAI.Beta.Threads.Messages.Message, 'id' | 'role' | 'created_at' | 'content' | 'run_id' | 'assistant_id' | 'thread_id' | 'attachments' | 'metadata' | 'status'> & {
  runSteps: SerializedRunStep[]
}

export type ToolCall = OpenAI.Beta.Threads.Runs.CodeInterpreterToolCall
  | OpenAI.Beta.Threads.Runs.FileSearchToolCall
  | OpenAI.Beta.Threads.Runs.FunctionToolCall

export type MessagesPage = {
  data: SerializedMessage[]
  hasNextPage: boolean
  lastId: string
}

export type MessageGroup = {
  id: string
  role: "user" | "assistant"
  messages: SerializedMessage[]
  createdAt: number
}

export type AudioEngine = {
  source: MediaStreamAudioSourceNode | GainNode
  audioContext: AudioContext
}

export type Toast = {
  type: 'success' | 'error'
  message: string
}

export type ThreadMessageCreatedEvent = OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadMessageCreated & {
  data: SerializedMessage
}

export type ThreadMessageCompletedEvent = OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadMessageCompleted & {
  data: SerializedMessage
}

export type ThreadRunStepDeltaEvent = OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadRunStepDelta & {
  data: {
    run_id: string
  }
}

export type MessagesQueryKey = (string | Record<string, any>)[]

export type IconAvatar = {
  name: IconAvatarName
}

export type ImageAvatar = {
  url: string
}

export type Avatar = {
  type: AvatarType
  iconAvatar: IconAvatar | null
  imageAvatar: ImageAvatar | null
}

export type Size = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export type StyleProps = {
  style?: React.CSSProperties
  className?: string
}

export type ThreadStorageOptions = {
  get: (args: { assistantId: string }) => string | null
  set: (args: { assistantId: string, threadId: string }) => void
  remove: (args: { assistantId: string }) => void
}

type UseCreateMessageTextVariables = {
  content: string
}

type UseCreateMessageAudioVariables = {
  audioContent: unknown
}

export type UseCreateMessageVariables = (UseCreateMessageTextVariables | UseCreateMessageAudioVariables) & {
  [key: string]: any
}

export type PlayArgs = {
  input: string
  onPlay: () => void
  onStop: () => void
  onEnd: () => void
}

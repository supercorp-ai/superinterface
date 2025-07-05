import OpenAI from 'openai'
import { AvatarType, IconAvatarName } from '@/lib/enums'

export type SerializedRunStep = Pick<
  OpenAI.Beta.Threads.Runs.RunStep,
  | 'id'
  | 'run_id'
  | 'step_details'
  | 'completed_at'
  | 'cancelled_at'
  | 'failed_at'
  | 'status'
>

export type SerializedMessage = Pick<
  OpenAI.Beta.Threads.Messages.Message,
  | 'id'
  | 'role'
  | 'created_at'
  | 'content'
  | 'run_id'
  | 'assistant_id'
  | 'thread_id'
  | 'attachments'
  | 'metadata'
  | 'status'
> & {
  runSteps: SerializedRunStep[]
}

export type ToolCall =
  | OpenAI.Beta.Threads.Runs.CodeInterpreterToolCall
  | OpenAI.Beta.Threads.Runs.FileSearchToolCall
  | OpenAI.Beta.Threads.Runs.FunctionToolCall

export type MessagesPage = {
  data: SerializedMessage[]
  hasNextPage: boolean
  lastId: string
}

export type MessageGroup = {
  id: string
  role: 'user' | 'assistant'
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

export type ThreadMessageCreatedEvent =
  OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadMessageCreated & {
    data: SerializedMessage
  }

export type ThreadMessageCompletedEvent =
  OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadMessageCompleted & {
    data: SerializedMessage
  }

export type ThreadRunStepDeltaEvent =
  OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadRunStepDelta & {
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
  set: (args: { assistantId: string; threadId: string }) => void
  remove: (args: { assistantId: string }) => void
}

type UseCreateMessageTextVariables = {
  content: string
}

type ContentPart =
  | {
      type: 'text'
      text: string
    }
  | {
      type: 'image_file'
      image_file: {
        file_id: string
        detail?: string
      }
    }
  | {
      type: 'image_url'
      image_url: {
        url: string
        detail?: string
      }
    }

type UseCreateMessageContentPartsVariables = {
  content: ContentPart[]
}

type UseCreateMessageAudioVariables = {
  audioContent: unknown
}

export type UseCreateMessageVariables = (
  | UseCreateMessageTextVariables
  | UseCreateMessageAudioVariables
  | UseCreateMessageContentPartsVariables
) & {
  [key: string]: any
}

export type PlayArgs = {
  input: string
  onPlay: () => void
  onStop: () => void
  onEnd: () => void
}

export type UserAudioControls = {
  start: () => Promise<void>
  stop: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  visualizationAnalyser: AnalyserNode | null

  isPending: boolean
  rawStatus?: string
}

export type AssistantAudioControls = {
  play: () => void
  pause: () => void
  stop: () => void
  visualizationAnalyser: AnalyserNode | null
  playing: boolean
  paused: boolean
  isPending: boolean
  isReady: boolean
  isAudioPlayed: boolean
  rawStatus?: string
}

export type AudioRuntime = {
  user: UserAudioControls
  assistant: AssistantAudioControls
}

export type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  byDay?: string[]
  byMonth?: number[]
  byHour?: number[]
  byMinute?: number[]
  bySecond?: number[]
  until?: string
  count?: number
  [key: string]: any
}

export type Schedule = {
  start: string
  due?: string
  recurrenceRules?: RecurrenceRule[]
  [key: string]: any
}

export type Task = {
  id: string
  title: string
  message: string
  schedule: Schedule
  threadId: string
  key: string
  createdAt: string
  updatedAt: string
}

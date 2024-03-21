import OpenAI from 'openai'

export type SerializedRunStep = Pick<OpenAI.Beta.Threads.Runs.RunStep, 'id' | 'run_id' | 'step_details' | 'completed_at' | 'cancelled_at' | 'failed_at' | 'status'>

export type SerializedMessage = Pick<OpenAI.Beta.Threads.Messages.Message, 'id' | 'role' | 'created_at' | 'content' | 'run_id' | 'assistant_id' | 'thread_id' | 'file_ids' | 'metadata' | 'status'> & {
  runSteps: SerializedRunStep[]
}

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

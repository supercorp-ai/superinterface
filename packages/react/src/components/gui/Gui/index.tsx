import type OpenAI from 'openai'
import { useMemo } from 'react'
import type { SerializedMessage, SerializedRunStep } from '@/types'
import { Flex, Card, Text, Spinner } from '@radix-ui/themes'
import { useLatestAssistantMessage } from '@/hooks/messages/useLatestAssistantMessage'
import { useLatestAssistantMessageWithContent } from '@/hooks/messages/useLatestAssistantMessageWithContent'
import { useComponents } from '@/hooks/components/useComponents'
import { ToolCall } from '@/components/runSteps/RunStep/ToolCalls/ToolCall'
import { MessageContent } from '@/components/messages/MessageContent'
import { useIsMutatingMessage } from '@/hooks/messages/useIsMutatingMessage'

const StartingToolCalls = () => {
  const {
    components: {
      StartingToolCalls,
    },
  } = useComponents()

  return (
    <StartingToolCalls />
  )
}

const Content = ({
  latestRunStep,
}: {
  latestRunStep: SerializedRunStep | null
}) => {
  const latestToolCall = useMemo(
    () => {
      if (!latestRunStep) return null
      if (!latestRunStep.step_details) return null
      if (latestRunStep.step_details.type !== 'tool_calls') return null

      return latestRunStep.step_details.tool_calls[0]
    },
    [latestRunStep],
  )

  if (!latestRunStep || latestRunStep.step_details.type !== 'tool_calls') {
    return (
      <Spinner />
    )
  }

  if (!latestToolCall) {
    return (
      <StartingToolCalls />
    )
  }

  return (
    <ToolCall
      runStep={latestRunStep}
      toolCall={latestToolCall}
    />
  )
}

const Progress = ({
  latestAssistantMessage,
}: {
  latestAssistantMessage: SerializedMessage
}) => {
  const isMutatingMessage = useIsMutatingMessage()

  const latestRunStep = useMemo(
    () =>
      latestAssistantMessage.runSteps.find(
        (rs) =>
          rs.status === 'in_progress',
      ) ?? null,
    [latestAssistantMessage],
  )

  if (latestAssistantMessage.status !== 'in_progress' && !isMutatingMessage) {
    return null
  }

  return (
    <Flex
      style={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        right: 0,
        justifyContent: 'center',
        padding: 'var(--space-5)',
      }}
    >
      <Card>
        <Content
          latestRunStep={latestRunStep}
        />
      </Card>
    </Flex>
  )
}

export const Gui = () => {
  const { latestAssistantMessage } = useLatestAssistantMessage()
  const { latestAssistantMessageWithContent } =
    useLatestAssistantMessageWithContent()

  if (!latestAssistantMessage || !latestAssistantMessageWithContent) {
    return (
      <Flex
        direction="column"
        flexGrow="1"
      >
        <Flex
          align="center"
          justify="center"
          flexGrow="1"
        >
          <Spinner size="3" />
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex
      direction="column"
      flexGrow="1"
    >
      <MessageContent message={latestAssistantMessageWithContent} />
      <Progress latestAssistantMessage={latestAssistantMessage} />
    </Flex>
  )
}

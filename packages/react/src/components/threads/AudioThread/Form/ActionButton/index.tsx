import {
  Flex,
  IconButton,
} from '@radix-ui/themes'
import {
  PauseIcon,
  ArrowUpIcon,
  ResumeIcon,
} from '@radix-ui/react-icons'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'

export const ActionButton = () => {
  const audioThreadContext = useAudioThreadContext()

  if (audioThreadContext.status === 'recording') {
    return (
      <Flex
        align="center"
      >
        <Flex
          mr="3"
          ml="-7"
        >
          <IconButton
            onClick={audioThreadContext.recorderProps.pause}
            color="gray"
            radius="full"
            variant="soft"
            size="1"
          >
            <PauseIcon />
          </IconButton>
        </Flex>

        <IconButton
          onClick={audioThreadContext.recorderProps.stop}
          highContrast
          radius="full"
          variant="soft"
          size="4"
          style={{
            border: '2px solid var(--gray-8)',
          }}
        >
          <ArrowUpIcon />
        </IconButton>
      </Flex>
    )
  }

  if (audioThreadContext.status === 'recorderPaused') {
    return (
      <IconButton
        onClick={audioThreadContext.recorderProps.resume}
        color="red"
        radius="full"
        size="4"
        style={{
          border: '2px solid var(--gray-8)',
        }}
      >
        <ResumeIcon />
      </IconButton>
    )
  }

  if (audioThreadContext.status === 'idle') {
    return (
      <IconButton
        onClick={() => audioThreadContext.recorderProps.start()}
        size="4"
        color="red"
        radius="full"
        style={{
          border: '2px solid var(--gray-8)',
        }}
      />
    )
  }

  if (audioThreadContext.status === 'playing') {
    return (
      <IconButton
        onClick={() => audioThreadContext.messageAudioProps.pause()}
        size="4"
        color="gray"
        radius="full"
        variant="soft"
        style={{
          border: '2px solid var(--gray-8)',
        }}
      >
        <PauseIcon />
      </IconButton>
    )
  }

  if (audioThreadContext.status === 'playerPaused') {
    return (
      <IconButton
        onClick={() => audioThreadContext.messageAudioProps.play()}
        size="4"
        radius="full"
        style={{
          border: '2px solid var(--gray-8)',
        }}
      >
        <ResumeIcon />
      </IconButton>
    )
  }

  return (
    <IconButton
      size="4"
      radius="full"
      variant="soft"
      disabled
      style={{
        border: '2px solid var(--gray-8)',
      }}
    />
  )
}

import {
  Flex,
  IconButton,
} from '@radix-ui/themes'
import {
  StopIcon,
  PauseIcon,
  ArrowUpIcon,
  ResumeIcon,
} from '@radix-ui/react-icons'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const ActionButton = () => {
  const audioThreadContext = useAudioThreadContext()
  const superinterfaceContext = useSuperinterfaceContext()

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
            variant="soft"
            size="1"
          >
            <PauseIcon />
          </IconButton>
        </Flex>

        <IconButton
          onClick={audioThreadContext.recorderProps.stop}
          highContrast
          variant="soft"
          size="4"
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
        size="4"
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
      />
    )
  }

  if (audioThreadContext.status === 'playing') {
    return (
      <IconButton
        onClick={() => {
          audioThreadContext.messageAudioProps.stop()
          superinterfaceContext.createMessageAbortControllerRef.current?.abort()
          audioThreadContext.recorderProps.start()
        }}
        size="4"
        color="gray"
        variant="soft"
      >
        <StopIcon />
      </IconButton>
    )
  }

  if (audioThreadContext.status === 'playerPaused') {
    return (
      <IconButton
        onClick={() => audioThreadContext.messageAudioProps.play()}
        size="4"
      >
        <ResumeIcon />
      </IconButton>
    )
  }

  return (
    <IconButton
      size="4"
      variant="soft"
      disabled
    />
  )
}

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
import { useStatus } from '@/hooks/audioThreads/useStatus'

export const ActionButton = () => {
  const { status } = useStatus()
  const audioThreadContext = useAudioThreadContext()
  const superinterfaceContext = useSuperinterfaceContext()

  if (status === 'recording') {
    return (
      <Flex
        align="center"
      >
        <Flex
          mr="3"
          ml="-7"
        >
          <IconButton
            onClick={audioThreadContext.audioRuntime.user.pause}
            color="gray"
            variant="soft"
            size="1"
          >
            <PauseIcon />
          </IconButton>
        </Flex>

        <IconButton
          onClick={audioThreadContext.audioRuntime.user.stop}
          highContrast
          variant="soft"
          size="4"
        >
          <ArrowUpIcon />
        </IconButton>
      </Flex>
    )
  }

  if (status === 'recorderPaused') {
    return (
      <IconButton
        onClick={audioThreadContext.audioRuntime.user.resume}
        color="red"
        size="4"
      >
        <ResumeIcon />
      </IconButton>
    )
  }

  if (status === 'idle') {
    return (
      <IconButton
        onClick={() => audioThreadContext.audioRuntime.user.start()}
        size="4"
        color="red"
      />
    )
  }

  if (status === 'playing') {
    return (
      <IconButton
        onClick={() => {
          audioThreadContext.audioRuntime.assistant.stop()
          superinterfaceContext.createMessageAbortControllerRef.current?.abort()
          audioThreadContext.audioRuntime.user.start()
        }}
        size="4"
        color="gray"
        variant="soft"
      >
        <StopIcon />
      </IconButton>
    )
  }

  if (status === 'playerPaused') {
    return (
      <IconButton
        onClick={() => audioThreadContext.audioRuntime.assistant.play()}
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

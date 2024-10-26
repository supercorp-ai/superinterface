import {
  PlayButton as VidstackPlayButton,
  useMediaState,
} from '@vidstack/react'
import {
  IconButton,
} from '@radix-ui/themes'
import {
  PlayIcon,
  PauseIcon,
} from '@radix-ui/react-icons'

export const PlayButton = () => {
  const isPaused = useMediaState('paused')

  return (
    <IconButton
      variant="ghost"
      asChild
    >
      <VidstackPlayButton>
        {isPaused ? <PlayIcon /> : <PauseIcon />}
      </VidstackPlayButton>
    </IconButton>
  )
}

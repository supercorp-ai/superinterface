import {
  FullscreenButton as VidstackFullscreenButton,
  useMediaState,
} from '@vidstack/react'
import {
  IconButton,
} from '@radix-ui/themes'
import {
  EnterFullScreenIcon,
  ExitFullScreenIcon,
} from '@radix-ui/react-icons'

export const FullscreenButton = () => {
  const isFullscreen = useMediaState('fullscreen')

  return (
    <IconButton
      variant="ghost"
      asChild
    >
      <VidstackFullscreenButton>
        {isFullscreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
      </VidstackFullscreenButton>
    </IconButton>
  )
}

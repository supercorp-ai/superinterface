import {
  MuteButton,
  useMediaState,
  useMediaRemote,
} from '@vidstack/react'
import {
  IconButton,
  HoverCard,
  Slider,
} from '@radix-ui/themes'
import {
  SpeakerModerateIcon,
  SpeakerOffIcon,
} from '@radix-ui/react-icons'

export const VolumeButton = () => {
  const volume = useMediaState('volume')
  const isMuted = useMediaState('muted')
  const remote = useMediaRemote()

  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <IconButton
          variant="ghost"
          asChild
        >
          <MuteButton>
            {(isMuted || volume === 0) ? <SpeakerOffIcon /> : <SpeakerModerateIcon />}
          </MuteButton>
        </IconButton>
      </HoverCard.Trigger>
      <HoverCard.Content
        size="1"
        side="top"
        height="100px"
      >
        <Slider
          size="1"
          variant="soft"
          orientation="vertical"
          value={[volume * 100]}
          onValueChange={([value]) => (
            remote.changeVolume(value / 100)
          )}
        />
      </HoverCard.Content>
    </HoverCard.Root>
  )
}

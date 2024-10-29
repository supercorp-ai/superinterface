import {
  Flex,
} from '@radix-ui/themes'
import '@vidstack/react/player/styles/base.css'
import {
  MediaPlayer,
  MediaProvider,
  Controls,
  AudioMimeType,
} from '@vidstack/react'
import { PlayButton } from '@/components/media/PlayButton'
import { VolumeButton } from '@/components/media/VolumeButton'
import { Time } from '@/components/media/Time'
import { MediaContainer } from '@/components/media/MediaContainer'

export const Audio = ({
  src,
}: {
  src: string
}) => (
  <MediaContainer>
    <MediaPlayer
      src={{
        src,
        type: `audio/${src.split('.').pop()}` as AudioMimeType,
      }}
      viewType="audio"
      crossOrigin
      playsInline
    >
      <MediaProvider />

      <Flex
        asChild
        p="3"
        flexGrow="1"
        style={{
          zIndex: 10,
          background: 'var(--accent-4)',
        }}
      >
        <Controls.Root>
          <Flex
            asChild
            align="center"
            gap="3"
            flexGrow="1"
          >
            <Controls.Group>
              <PlayButton />
              <Time />
              <VolumeButton />
            </Controls.Group>
          </Flex>
        </Controls.Root>
      </Flex>
    </MediaPlayer>
  </MediaContainer>
)

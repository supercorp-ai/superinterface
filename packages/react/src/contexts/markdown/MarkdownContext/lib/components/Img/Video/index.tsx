import {
  Flex,
} from '@radix-ui/themes'
import '@vidstack/react/player/styles/base.css'
import {
  MediaPlayer,
  MediaProvider,
  Controls,
} from '@vidstack/react'
import { PlayButton } from '@/components/media/PlayButton'
import { VolumeButton } from '@/components/media/VolumeButton'
import { Time } from '@/components/media/Time'
import { MediaContainer } from '@/components/media/MediaContainer'
import { FullscreenButton } from './FullscreenButton'

export const Video = ({
  src,
}: {
  src: string
}) => (
  <MediaContainer>
    <MediaPlayer
      src={src}
      playsInline
      hideControlsOnMouseLeave
      crossOrigin
    >
      <MediaProvider />

      <style>
        {`
          .superinterface-video-controls {
            opacity: 0;
            transition: opacity 0.2s ease-out;
          }

          .superinterface-video-controls[data-visible] {
            opacity: 1;
          }
        `}
      </style>
      <Flex
        asChild
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        className="superinterface-video-controls"
        p="3"
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
              <FullscreenButton />
            </Controls.Group>
          </Flex>
        </Controls.Root>
      </Flex>
    </MediaPlayer>
  </MediaContainer>
)

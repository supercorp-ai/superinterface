import {
  Card,
  IconButton,
  Flex,
} from '@radix-ui/themes'
import {
  ZoomInIcon,
  ZoomOutIcon,
} from '@radix-ui/react-icons'
import type { TUsePDFSlickStore } from "@pdfslick/react"

export const Navigation = ({
  usePDFSlickStore,
}: {
  usePDFSlickStore: TUsePDFSlickStore
}) => {
  const pdfSlick = usePDFSlickStore((s) => s.pdfSlick)

  return (
    <Flex
      justify="center"
      position="absolute"
      bottom="var(--space-2)"
      left="0"
      right="0"
      style={{
        zIndex: 99999,
      }}
    >
      <Card>
        <Flex
          gap="2"
        >
          <IconButton
            variant="soft"
            onClick={() => pdfSlick?.viewer?.decreaseScale()}
          >
            <ZoomOutIcon />
          </IconButton>

          <IconButton
            variant="soft"
            onClick={() => pdfSlick?.viewer?.increaseScale()}
          >
            <ZoomInIcon />
          </IconButton>
        </Flex>
      </Card>
    </Flex>
  )
}

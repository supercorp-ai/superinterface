import { useState } from 'react'
import OpenAI from 'openai'
import {
  QuoteIcon,
} from '@radix-ui/react-icons'
import {
  Dialog,
  VisuallyHidden,
  IconButton,
} from '@radix-ui/themes'
import { Content } from './Content'

export const FileCitation = ({
  annotation,
}: {
  annotation: OpenAI.Beta.Threads.Messages.FileCitationAnnotation
}) => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null)

  return (
    <>
      <IconButton
        variant="soft"
        color="gray"
        size="1"
        onClick={() => {
          setActiveFileId(annotation.file_citation.file_id)
        }}
      >
        <QuoteIcon />
      </IconButton>

      <Dialog.Root
        open={!!activeFileId}
        onOpenChange={(open) => {
          if (!open) {
            setActiveFileId(null)
          }
        }}
      >
        <Dialog.Content
          width="1000px"
          height="90vh"
          maxWidth="calc(100vw - 2 * var(--space-4))"
          aria-describedby={undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <VisuallyHidden
            asChild
          >
            <Dialog.Title>
              Source
            </Dialog.Title>
          </VisuallyHidden>

          {activeFileId && <Content
            fileId={activeFileId}
          />}
        </Dialog.Content>
      </Dialog.Root>
    </>
  )
}

import {
  Flex,
  Card,
  Inset,
} from '@radix-ui/themes'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { usePDFSlick } from '@pdfslick/react'
import '@pdfslick/react/dist/pdf_viewer.css'
import { Navigation } from './Navigation'

export const Content = ({
  fileId,
}: {
  fileId: string
}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const nextSearchParams = new URLSearchParams(superinterfaceContext.variables)

  const { viewerRef, usePDFSlickStore, PDFSlickViewer } = usePDFSlick(
    `${superinterfaceContext.baseUrl}/api/cloud/files/${fileId}/contents?${nextSearchParams}`,
    {
      scaleValue: 'page-width',
      removePageBorders: true,
    }
  )

  return (
    <Flex
      direction="column"
      flexGrow="1"
      gap="3"
    >
      <Card
        style={{
          display: 'flex',
          flexGrow: '1',
        }}
      >
        <Inset
          clip="padding-box"
          style={{
            display: 'flex',
            flexGrow: '1',
          }}
        >
          <Flex
            flexGrow="1"
            position="relative"
          >
            <PDFSlickViewer {...{ viewerRef, usePDFSlickStore }} />

            <Navigation
              usePDFSlickStore={usePDFSlickStore}
            />
          </Flex>
        </Inset>
      </Card>
    </Flex>
  )
}

import {
  Card,
  Inset,
} from '@radix-ui/themes'
import { useThreadDialogContext } from '@/hooks/threads/useThreadDialogContext'

type Args = {
  children: React.ReactNode
}

export const Content = ({
  children,
}: Args) => {
  const { isOpen } = useThreadDialogContext()
  if (!isOpen) return null

  return (
    <Card
      mb="3"
      style={{
        display: 'flex',
        flexGrow: 1,
        width: '100vw',
        maxWidth: '400px',
        maxHeight: '720px',
      }}
    >
      <Inset
        clip="padding-box"
        side="all"
        pb="current"
        style={{
          display: 'flex',
          flexGrow: 1,
        }}
      >
        {children}
      </Inset>
    </Card>
  )
}

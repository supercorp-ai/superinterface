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
    <>
      <style>
        {`.superinterface-thread-dialog-card .rt-CardInner { display: flex; }`}
      </style>
      <Card
        className="superinterface-thread-dialog-card"
        mb="3"
        style={{
          flexGrow: 1,
          width: '100vw',
          maxWidth: '400px',
          maxHeight: '720px',
        }}
        // grow="1"
      // Flex
      //   direction="column"
      //   position="relative"
      //   grow="1"
      //   mb="3"
      //   // boxShadow='light'
      //   style={{
      //     boxShadow: 'var(--shadow-6)',
      //     borderRadius: 'var(--radius-5)',
      //   }}
        // borderRadius={{ xs: undefined, sm: 'rounded' }}
        // width={{ xs: '100vw', sm: 'calc(100vw - 32px)' }}
        // maxWidth={{ xs: undefined, sm: 47 }}
        // maxHeight={{ xs: undefined, sm: 90 }}
        // marginBottom={{ xs: 0, sm: 2 }}
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
    </>
  )
}

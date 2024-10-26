import {
  Card,
  Inset,
} from '@radix-ui/themes'

export const MediaContainer = ({
  children,
}: {
  children: React.ReactNode
}) => (
  <Card
    mb="3"
  >
    <Inset
      clip="padding-box"
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </Inset>
  </Card>
)

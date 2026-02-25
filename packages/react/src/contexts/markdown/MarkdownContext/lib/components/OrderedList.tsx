import { Box } from '@radix-ui/themes'

export const OrderedList = ({ children }: JSX.IntrinsicElements['ol']) => (
  <Box
    pb="3"
    pl="5"
    asChild
  >
    <ol style={{ listStylePosition: 'outside', listStyleType: 'decimal' }}>
      {children}
    </ol>
  </Box>
)

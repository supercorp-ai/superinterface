import {
  Box,
} from '@radix-ui/themes'

export const OrderedList = ({ children }: JSX.IntrinsicElements['ul']) => (
  <Box
    pb="3"
    asChild
  >
    <ol
      style={{
        listStylePosition: 'inside',
      }}
    >
      {children}
    </ol>
  </Box>
)

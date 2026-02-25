import { Box } from '@radix-ui/themes'

export const UnorderedList = ({ children }: JSX.IntrinsicElements['ul']) => (
  <Box
    pb="3"
    pl="5"
    asChild
  >
    <ul style={{ listStylePosition: 'outside', listStyleType: 'disc' }}>
      {children}
    </ul>
  </Box>
)

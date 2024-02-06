import {
  Box,
} from '@radix-ui/themes'

export const UnorderedList = ({ children }: JSX.IntrinsicElements['ul']) => (
  <Box
    pb="3"
    asChild
  >
    <ul
      style={{
        listStylePosition: 'inside',
      }}
    >
      {children}
    </ul>
  </Box>
)

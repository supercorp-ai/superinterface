import {
  Box,
} from '@radix-ui/themes'

export const Pre = ({ children }: JSX.IntrinsicElements['pre']) => (
  <Box
    style={{
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}
  >
    {children}
  </Box>
)

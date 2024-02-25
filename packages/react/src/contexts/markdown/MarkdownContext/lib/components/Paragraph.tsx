import {
  Box,
  Text,
} from '@radix-ui/themes'

export const Paragraph = ({ children }: JSX.IntrinsicElements['p']) => (
  <Box
    pb="3"
  >
    <Text
      size="3"
      style={{
        whiteSpace: 'pre-line',
        wordBreak: 'break-word',
      }}
    >
      {children}
    </Text>
  </Box>
)

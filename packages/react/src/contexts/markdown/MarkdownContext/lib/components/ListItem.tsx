import {
  Box,
} from '@radix-ui/themes'

export const ListItem = ({ children }: JSX.IntrinsicElements['li']) => (
  <Box
    pb="1"
  >
    <li
      style={{
        wordBreak: 'break-word',
      }}
    >
      {children}
    </li>
  </Box>
)

import { Box } from '@radix-ui/themes'

export const ListItem = ({ children }: JSX.IntrinsicElements['li']) => (
  <Box
    pb="1"
    asChild
  >
    <li
      style={{
        display: 'list-item',
        wordBreak: 'break-word',
      }}
    >
      {children}
    </li>
  </Box>
)

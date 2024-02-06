import {
  Box,
} from '@radix-ui/themes'

export const StartingContentSkeleton = () => (
  <Box
    height="4"
    width="4"
    shrink="0"
    mt="1"
    style={{
      animation: 'pulse 2s cubic-bezier(.4,0,.6,1) infinite',
      borderRadius: 'var(--radius-3)',
      backgroundColor: 'var(--gray-12)',
    }}
  />
)

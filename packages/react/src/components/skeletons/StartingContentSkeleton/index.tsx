import {
  Box,
} from '@radix-ui/themes'

export const StartingContentSkeleton = () => (
  <Box
    flexShrink="0"
    mt="1"
    height="var(--space-4)"
    width="var(--space-4)"
    style={{
      animation: 'pulse 2s cubic-bezier(.4,0,.6,1) infinite',
      borderRadius: 'var(--radius-3)',
      backgroundColor: 'var(--gray-12)',
    }}
  />
)

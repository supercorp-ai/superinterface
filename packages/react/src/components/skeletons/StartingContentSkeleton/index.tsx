import {
  Skeleton,
} from '@radix-ui/themes'

export const StartingContentSkeleton = () => (
  <Skeleton
    loading
    mt="1"
    height="var(--space-4)"
    width="var(--space-4)"
    style={{
      borderRadius: 'var(--radius-6)',
      flexShrink: 0,
    }}
  />
)

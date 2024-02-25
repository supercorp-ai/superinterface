import {
  Flex,
  Button,
} from '@radix-ui/themes'
import {
  CircleIcon,
} from '@radix-ui/react-icons'
import { Skeleton } from '@/components/skeletons/Skeleton'

export const RunSkeleton = () => (
  <Flex
    py="1"
    ml="-2"
  >
    <Button
      disabled
      size="1"
      color="gold"
      variant="outline"
      style={{
        boxShadow: 'none',
      }}
    >
      <CircleIcon
        style={{
          animation: 'pulse 2s cubic-bezier(.4,0,.6,1) infinite',
        }}
      />

      <Skeleton
        height="1"
        style={{
          width: '128px',
          backgroundColor: 'var(--gold-5)',
        }}
      />
    </Button>
  </Flex>
)

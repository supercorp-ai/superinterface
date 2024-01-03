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
        className="animate-pulse"
      />

      <Skeleton
        height="1"
        className="w-[128px] bg-gold-5"
      />
    </Button>
  </Flex>
)

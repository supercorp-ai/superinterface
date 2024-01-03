import { Flex } from '@radix-ui/themes'

type Props = {
  height: string
  className: string
}

export const Skeleton = ({
  className,
  ...rest
}: Props) => (
  // @ts-ignore-next-line
  <Flex
    className={`animate-pulse rounded-3 bg-gray-5 ${className}`}
    {...rest}
  />
)

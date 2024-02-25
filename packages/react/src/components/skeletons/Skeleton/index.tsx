import { Flex } from '@radix-ui/themes'

type Props = {
  height: string
  style: React.CSSProperties
}

export const Skeleton = ({
  height,
  style,
  ...rest
}: Props) => (
  // @ts-ignore-next-line
  <Flex
    style={{
      animation: 'pulse 2s cubic-bezier(.4,0,.6,1) infinite',
      borderRadius: 'var(--radius-3)',
      backgroundColor: 'var(--gray-5)',
      height: `var(--space-${height})`,
      ...style,
    }}
    {...rest}
  />
)

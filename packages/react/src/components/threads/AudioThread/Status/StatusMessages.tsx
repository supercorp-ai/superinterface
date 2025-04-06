import {
  Flex,
  Text,
} from '@radix-ui/themes'
import type { StyleProps } from '@/types'

const html = ({ texts }: { texts: string[] }) => `
  .status-messages-texts:after {
    content: '${texts[0]}';
    animation: texts ${texts.length * 5}s linear infinite;
  }

  @keyframes texts {
    ${texts.map((_, i) => `
      ${i * 100 / texts.length}% {
        content: "${texts[i]}";
      }
    `).join('')}
  }`

export const StatusMessages = ({
  texts,
  className,
  style,
}: {
  texts: string[]
} & StyleProps) => (
  <Flex
    justify="center"
    pb="5"
    className={className}
    style={style}
  >
    <Text
      size="2"
      weight="regular"
      color="gray"
      className="status-messages-texts"
      align="center"
    />

    <style
      dangerouslySetInnerHTML={{
        __html: html({ texts }),
      }}
    />
  </Flex>
)

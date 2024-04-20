import {
  Flex,
  Text,
} from '@radix-ui/themes'

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
}: {
  texts: string[]
}) => (
  <Flex
    justify="center"
    pb="5"
  >
    <Text
      size="2"
      weight="regular"
      color="gray"
      className="status-messages-texts"
    />

    <style
      dangerouslySetInnerHTML={{
        __html: html({ texts }),
      }}
    />
  </Flex>
)

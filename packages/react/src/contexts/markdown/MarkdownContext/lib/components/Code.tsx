import {
  Code as RadixCode,
} from '@radix-ui/themes'
import { Suggestions } from '@/components/suggestions/Suggestions'

export const Code = ({
  children,
  className,
}: JSX.IntrinsicElements['code']) => {
  if (className === 'language-suggestions') {
    return <Suggestions>{children}</Suggestions>
  }

  return (
    <RadixCode
      style={{
        wordBreak: 'break-word',
      }}
    >
      {children}
    </RadixCode>
  )
}

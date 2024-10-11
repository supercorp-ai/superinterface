import { useMemo } from 'react'
import {
  MarkdownProvider as SuperinterfaceMarkdownProvider,
  useMarkdownContext,
} from '@superinterface/react'
import { Code } from './Code'

type Args = {
  children: React.ReactNode
}

export const MarkdownProvider = ({
  children,
}: Args) => {
  const markdownContext = useMarkdownContext()

  const components = useMemo(() => ({
    code: (props:  JSX.IntrinsicElements['code']) => (
      // @ts-ignore-next-line
      <Code
        {...props}
        markdownContext={markdownContext}
      />
    ),
  }), [markdownContext])

  return (
    <SuperinterfaceMarkdownProvider
      // @ts-ignore-next-line
      components={components}
    >
      {children}
    </SuperinterfaceMarkdownProvider>
  )
}

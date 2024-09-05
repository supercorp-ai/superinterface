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
      // @ts-expect-error broad types
      <Code
        {...props}
        markdownContext={markdownContext}
      />
    ),
  }), [markdownContext])

  return (
    <SuperinterfaceMarkdownProvider
      // @ts-expect-error broad types
      components={components}
    >
      {children}
    </SuperinterfaceMarkdownProvider>
  )
}

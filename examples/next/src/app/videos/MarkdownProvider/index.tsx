import { useMemo } from 'react'
import {
  MarkdownProvider as SuperinterfaceMarkdownProvider,
  useMarkdownContext,
} from '@superinterface/react'
import { Link } from './Link'

type Args = {
  children: React.ReactNode
}

export const MarkdownProvider = ({
  children,
}: Args) => {
  const markdownContext = useMarkdownContext()

  const components = useMemo(() => ({
    a: (props:  JSX.IntrinsicElements['a']) => <Link {...props} markdownContext={markdownContext} />,
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

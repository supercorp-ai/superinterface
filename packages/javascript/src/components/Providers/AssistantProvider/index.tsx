import { useMemo } from 'react'
import {
  useSuperinterfaceContext,
  AssistantNameContext,
  MarkdownProvider,
  useMarkdownContext,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'
import { useAssistant } from '@/hooks/assistants/useAssistant'
import { Code } from './Code'

type Args = {
  children: React.ReactNode
}

export const AssistantProvider = ({
  children,
}: Args) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const { assistant } = useAssistant({
    assistantId: superinterfaceContext.variables.assistantId,
  })

  const markdownContext = useMarkdownContext()

  const components = useMemo(() => ({
    code: (props:  JSX.IntrinsicElements['code']) => <Code {...props} markdownContext={markdownContext} />,
  }), [markdownContext])

  if (!assistant) {
    return null
  }

  return (
    <Theme
      accentColor={assistant.theme.accentColor}
      grayColor={assistant.theme.grayColor}
      radius={assistant.theme.radius}
      appearance={assistant.theme.appearance}
      scaling={assistant.theme.scaling}
      panelBackground="solid"
      hasBackground={false}
    >
      <AssistantNameContext.Provider value={assistant.name}>
        <MarkdownProvider rehypeReactOptions={{ components }}>
          {children}
        </MarkdownProvider>
      </AssistantNameContext.Provider>
    </Theme>
  )
}
